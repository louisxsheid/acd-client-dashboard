<script lang="ts">
  import { getCarrierName, getCarrierColor } from "../carriers";

  interface CarrierBandData {
    country_id: number;
    provider_id: number;
    b2: number;
    b4: number;
    b5: number;
    b12: number;
    b13: number;
    b14: number;
    b30: number;
    b41: number;
    b66: number;
    b71: number;
  }

  interface Props {
    carriers: CarrierBandData[];
  }

  let { carriers }: Props = $props();

  const bands = [
    { key: "b66", name: "B66", fullName: "AWS-3", tier: "mid" },
    { key: "b2", name: "B2", fullName: "PCS", tier: "mid" },
    { key: "b4", name: "B4", fullName: "AWS-1", tier: "mid" },
    { key: "b13", name: "B13", fullName: "700c", tier: "low" },
    { key: "b12", name: "B12", fullName: "700a/b", tier: "low" },
    { key: "b71", name: "B71", fullName: "600", tier: "low" },
    { key: "b41", name: "B41", fullName: "2.5G", tier: "high" },
    { key: "b5", name: "B5", fullName: "850", tier: "low" },
    { key: "b14", name: "B14", fullName: "FirstNet", tier: "low" },
    { key: "b30", name: "B30", fullName: "WCS", tier: "mid" },
  ] as const;

  // Aggregate carriers by display name (combines multiple MCC-MNC codes for same carrier)
  function aggregateCarriers() {
    const carrierMap = new Map<string, {
      name: string;
      color: string;
      b2: number;
      b4: number;
      b5: number;
      b12: number;
      b13: number;
      b14: number;
      b30: number;
      b41: number;
      b66: number;
      b71: number;
      total: number;
    }>();

    carriers.forEach((c) => {
      const name = getCarrierName(c.country_id, c.provider_id);
      const color = getCarrierColor(c.country_id, c.provider_id);

      if (carrierMap.has(name)) {
        const existing = carrierMap.get(name)!;
        existing.b2 += c.b2 || 0;
        existing.b4 += c.b4 || 0;
        existing.b5 += c.b5 || 0;
        existing.b12 += c.b12 || 0;
        existing.b13 += c.b13 || 0;
        existing.b14 += c.b14 || 0;
        existing.b30 += c.b30 || 0;
        existing.b41 += c.b41 || 0;
        existing.b66 += c.b66 || 0;
        existing.b71 += c.b71 || 0;
        existing.total = existing.b2 + existing.b4 + existing.b5 + existing.b12 +
                         existing.b13 + existing.b14 + existing.b30 + existing.b41 +
                         existing.b66 + existing.b71;
      } else {
        const b2 = c.b2 || 0;
        const b4 = c.b4 || 0;
        const b5 = c.b5 || 0;
        const b12 = c.b12 || 0;
        const b13 = c.b13 || 0;
        const b14 = c.b14 || 0;
        const b30 = c.b30 || 0;
        const b41 = c.b41 || 0;
        const b66 = c.b66 || 0;
        const b71 = c.b71 || 0;
        carrierMap.set(name, {
          name,
          color,
          b2, b4, b5, b12, b13, b14, b30, b41, b66, b71,
          total: b2 + b4 + b5 + b12 + b13 + b14 + b30 + b41 + b66 + b71,
        });
      }
    });

    return Array.from(carrierMap.values())
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }

  let sortedCarriers = $derived(aggregateCarriers());

  // Get bands sorted by total count, filter out zero bands
  let activeBands = $derived(
    [...bands]
      .map(b => ({
        ...b,
        total: sortedCarriers.reduce((sum, c) => sum + ((c as any)[b.key] || 0), 0),
      }))
      .filter(b => b.total > 0)
      .sort((a, b) => b.total - a.total)
  );

  // Find max value for bar normalization (across all cells)
  let maxValue = $derived(
    Math.max(
      ...sortedCarriers.flatMap((c) =>
        activeBands.map(b => (c as any)[b.key] || 0)
      ),
      1
    )
  );

  // Tier colors for band headers
  const tierColors: Record<string, string> = {
    low: "#22c55e",
    mid: "#3b82f6",
    high: "#8b5cf6",
  };
</script>

<div class="carrier-bands">
  <div class="section-header">
    <h3>Band Deployment by Carrier</h3>
    <p class="section-subtitle">Spectrum allocation matrix - bar width shows relative deployment</p>
  </div>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th class="carrier-col">Carrier</th>
          {#each activeBands as band}
            <th class="band-header">
              <span class="band-name" style="color: {tierColors[band.tier]}">{band.name}</span>
              <span class="band-full">{band.fullName}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each sortedCarriers as carrier}
          <tr>
            <td class="carrier-name">
              <span class="carrier-dot" style="background: {carrier.color}"></span>
              <span class="carrier-label">{carrier.name}</span>
            </td>
            {#each activeBands as band}
              {@const value = (carrier as any)[band.key] || 0}
              {@const percentage = (value / maxValue) * 100}
              <td class="band-cell">
                {#if value > 0}
                  <div class="band-bar-container">
                    <div
                      class="band-bar"
                      style="width: {percentage}%; background: {carrier.color}"
                    ></div>
                  </div>
                  <span class="band-value">{value.toLocaleString()}</span>
                {:else}
                  <span class="band-empty">—</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="band-legend">
    <span class="legend-item"><span class="legend-dot" style="background: #22c55e"></span>Low Band (&lt;1GHz)</span>
    <span class="legend-item"><span class="legend-dot" style="background: #3b82f6"></span>Mid Band (1-6GHz)</span>
    <span class="legend-item"><span class="legend-dot" style="background: #8b5cf6"></span>High Band (&gt;6GHz)</span>
  </div>
</div>

<style>
  .carrier-bands {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section-header {
    margin-bottom: 1.25rem;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .section-subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #71717a;
  }

  .table-wrapper {
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }

  th {
    text-align: left;
    padding: 0.75rem 0.5rem;
    font-size: 0.7rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid #27273a;
    font-weight: 500;
  }

  th.carrier-col {
    width: 120px;
    min-width: 100px;
  }

  .band-header {
    text-align: center;
    min-width: 70px;
    width: 80px;
  }

  .band-name {
    display: block;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0;
  }

  .band-full {
    display: block;
    font-size: 0.6rem;
    font-weight: 400;
    color: #52525b;
    margin-top: 1px;
  }

  td {
    padding: 0.625rem 0.5rem;
    border-bottom: 1px solid #27273a;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: rgba(39, 39, 58, 0.5);
  }

  .carrier-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .carrier-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .carrier-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #f4f4f5;
    white-space: nowrap;
  }

  .band-cell {
    text-align: center;
    padding: 0.5rem 0.375rem;
  }

  .band-bar-container {
    height: 6px;
    background: #1a1a2e;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .band-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease-out;
    min-width: 2px;
  }

  .band-value {
    font-size: 0.7rem;
    color: #a1a1aa;
    font-variant-numeric: tabular-nums;
  }

  .band-empty {
    font-size: 0.7rem;
    color: #3f3f5a;
  }

  .band-legend {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #27273a;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: #71717a;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  @media (max-width: 800px) {
    table {
      min-width: 500px;
    }

    .band-header {
      min-width: 60px;
      width: 65px;
    }

    th.carrier-col {
      width: 90px;
      min-width: 80px;
    }
  }
</style>
