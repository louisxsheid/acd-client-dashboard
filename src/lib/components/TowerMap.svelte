<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getCarrierName } from "../carriers";
  import type { Map } from "leaflet";

  interface Cluster {
    lat: number;
    lng: number;
    count: number;
    towers: any[];
    lte: number;
    nr: number;
    endc: number;
  }

  interface Props {
    clusters: Cluster[];
    totalCount: number;
    loading: boolean;
    onBoundsChange: (bounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
      zoom: number;
    }) => void;
  }

  let { clusters, totalCount, loading, onBoundsChange }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let markersLayer: any = null;
  let L: typeof import("leaflet") | null = null;

  // Get primary RAT from tower_providers
  function getTowerPrimaryRAT(tower: any): string | null {
    return tower?.tower_providers?.[0]?.rat ?? null;
  }

  // Get primary provider from tower_providers
  function getTowerPrimaryProvider(tower: any): any | null {
    return tower?.tower_providers?.[0]?.provider ?? null;
  }

  // Get color based on dominant technology in cluster
  function getClusterColor(cluster: Cluster): string {
    if (cluster.count === 1) {
      // Single tower - use RAT color from tower_providers
      const tower = cluster.towers[0];
      const rat = getTowerPrimaryRAT(tower);
      switch (rat) {
        case "LTE": return "#3b82f6";
        case "NR": return "#8b5cf6";
        case "GSM": return "#22c55e";
        case "CDMA": return "#f59e0b";
        case "UMTS": return "#ec4899";
        default: return "#71717a";
      }
    }
    // Cluster - blend based on composition
    if (cluster.nr > cluster.lte) return "#8b5cf6"; // 5G dominant
    if (cluster.lte > 0) return "#3b82f6"; // LTE dominant
    return "#71717a";
  }

  // Get radius based on cluster size
  function getClusterRadius(count: number, zoom: number): number {
    if (count === 1) return zoom >= 12 ? 6 : 4;

    // Scale radius logarithmically with count
    const base = zoom >= 10 ? 10 : zoom >= 6 ? 12 : 15;
    const scale = Math.log10(count + 1);
    return Math.min(base + scale * 6, 40);
  }

  function formatCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  }

  function updateMarkers() {
    if (!map || !markersLayer || !L) return;

    markersLayer.clearLayers();
    const zoom = map.getZoom();

    for (const cluster of clusters) {
      const color = getClusterColor(cluster);
      const radius = getClusterRadius(cluster.count, zoom);
      const isCluster = cluster.count > 1;

      if (isCluster) {
        // Create cluster marker with count label
        const marker = L.circleMarker([cluster.lat, cluster.lng], {
          radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        // Add label for cluster count
        const label = L.divIcon({
          className: 'cluster-label',
          html: `<span>${formatCount(cluster.count)}</span>`,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
        });
        const labelMarker = L.marker([cluster.lat, cluster.lng], { icon: label, interactive: false });

        marker.bindPopup(`
          <div style="font-family: system-ui; font-size: 13px; min-width: 150px;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px;">${cluster.count.toLocaleString()} towers</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${cluster.lte > 0 ? `<div style="display: flex; align-items: center; gap: 6px;">
                <span style="background: #3b82f6; width: 10px; height: 10px; border-radius: 50%;"></span>
                LTE: ${cluster.lte.toLocaleString()}
              </div>` : ''}
              ${cluster.nr > 0 ? `<div style="display: flex; align-items: center; gap: 6px;">
                <span style="background: #8b5cf6; width: 10px; height: 10px; border-radius: 50%;"></span>
                5G NR: ${cluster.nr.toLocaleString()}
              </div>` : ''}
              ${cluster.endc > 0 ? `<div style="display: flex; align-items: center; gap: 6px;">
                <span style="background: #8b5cf6; border: 2px solid white; width: 8px; height: 8px; border-radius: 50%;"></span>
                EN-DC: ${cluster.endc.toLocaleString()}
              </div>` : ''}
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #888;">
              Click to zoom in
            </div>
          </div>
        `);

        marker.on('click', () => {
          map?.setView([cluster.lat, cluster.lng], zoom + 2);
        });

        markersLayer.addLayer(marker);
        markersLayer.addLayer(labelMarker);
      } else {
        // Single tower marker
        const tower = cluster.towers[0];
        const primaryProvider = getTowerPrimaryProvider(tower);
        const primaryRAT = getTowerPrimaryRAT(tower);
        const carrierName = primaryProvider
          ? getCarrierName(primaryProvider.country_id, primaryProvider.provider_id)
          : "Unknown";
        const hasEndc = tower?.tower_providers?.some((tp: any) => tp.endc_available) ?? false;

        const marker = L.circleMarker([cluster.lat, cluster.lng], {
          radius,
          fillColor: color,
          color: hasEndc ? "#fff" : color,
          weight: hasEndc ? 2 : 1,
          opacity: 1,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="font-family: system-ui; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">#${tower?.id}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${primaryRAT || "Unknown"}</span>
              ${hasEndc ? '<span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">EN-DC</span>' : ""}
            </div>
            <div style="color: #666; margin-bottom: 2px;">${tower?.tower_type || "Unknown Type"}</div>
            <div style="color: #888; margin-bottom: 4px;">${carrierName}</div>
            <div style="font-family: monospace; font-size: 11px; color: #999;">
              ${cluster.lat.toFixed(5)}, ${cluster.lng.toFixed(5)}
            </div>
          </div>
        `);

        markersLayer.addLayer(marker);
      }
    }
  }

  function handleMoveEnd() {
    if (!map) return;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    onBoundsChange({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
      zoom,
    });
  }

  onMount(async () => {
    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");

    map = L.map(mapContainer, {
      preferCanvas: true,
    }).setView([39.8283, -98.5795], 4);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    // Initial load
    handleMoveEnd();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  // Update markers when clusters change
  $effect(() => {
    const clusterCount = clusters?.length ?? 0;
    if (clusterCount > 0 && markersLayer && L) {
      updateMarkers();
    }
  });

  let displayedCount = $derived(clusters.reduce((sum, c) => sum + c.count, 0));
</script>

<div class="map-container">
  <div class="map-header">
    <h3>Tower Map</h3>
    <div class="map-stats">
      {#if loading}
        <span class="loading-indicator">
          <span class="loading-dot"></span>
          Loading...
        </span>
      {:else}
        <span class="tower-count">
          {clusters.length.toLocaleString()} clusters
          <span class="total-hint">({totalCount.toLocaleString()} towers in view)</span>
        </span>
      {/if}
    </div>
  </div>
  <div class="map-wrapper">
    <div bind:this={mapContainer} class="map"></div>
    <div class="legend">
      <div class="legend-title">Technology</div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #3b82f6"></span> LTE
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #8b5cf6"></span> 5G NR
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #ec4899"></span> UMTS
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #f59e0b"></span> CDMA
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22c55e"></span> GSM
      </div>
      <div class="legend-divider"></div>
      <div class="legend-item">
        <span class="legend-dot endc"></span> EN-DC
      </div>
      <div class="legend-divider"></div>
      <div class="legend-hint">Click cluster to zoom in</div>
    </div>
  </div>
</div>

<style>
  .map-container {
    background: #1e1e2e;
    border-radius: 12px;
    overflow: hidden;
  }

  .map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #27273a;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .map-stats {
    font-size: 0.875rem;
    color: #71717a;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #3b82f6;
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .total-hint {
    color: #52525b;
    font-size: 0.8rem;
  }

  .map-wrapper {
    position: relative;
    height: 600px;
  }

  .map {
    width: 100%;
    height: 100%;
  }

  .legend {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(30, 30, 46, 0.95);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    z-index: 1000;
    font-size: 0.75rem;
    color: #a1a1aa;
    backdrop-filter: blur(4px);
  }

  .legend-title {
    font-weight: 600;
    color: #f4f4f5;
    margin-bottom: 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-dot.endc {
    background: #8b5cf6;
    border: 2px solid white;
    width: 8px;
    height: 8px;
  }

  .legend-divider {
    height: 1px;
    background: #27273a;
    margin: 0.5rem 0;
  }

  .legend-hint {
    color: #52525b;
    font-size: 0.65rem;
    font-style: italic;
  }

  /* Leaflet popup overrides */
  :global(.leaflet-popup-content-wrapper) {
    background: #1e1e2e;
    color: #f4f4f5;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  :global(.leaflet-popup-tip) {
    background: #1e1e2e;
  }

  :global(.leaflet-popup-close-button) {
    color: #71717a !important;
  }

  :global(.leaflet-popup-close-button:hover) {
    color: #f4f4f5 !important;
  }

  /* Cluster label styles */
  :global(.cluster-label) {
    background: transparent !important;
    border: none !important;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  :global(.cluster-label span) {
    color: white;
    font-weight: 700;
    font-size: 11px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
</style>
