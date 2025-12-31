<script lang="ts">
  import { getCarrierName, getCarrierColorByName } from "../carriers";

  // Types
  interface ModelVersion {
    model_version: string;
    run_id: string | null;
    created_at: string | null;
  }

  interface AnomalyStats {
    total: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    above95: number;
    above99: number;
    run_id: string | null;
    created_at: string | null;
  }

  interface CoverageGapStats {
    total: number;
    highConfidence: number;
    avgConfidence: number;
    avgDistance: number;
    missingLinks: number;
    avgLinkProbability: number;
    run_id: string | null;
    created_at: string | null;
  }

  interface AnomalyScore {
    tower_id: number;
    anomaly_score: number;
    percentile: number;
    link_pred_error: number | null;
    neighbor_inconsistency: number | null;
    tower: {
      latitude: number;
      longitude: number;
      tower_type: string | null;
      provider_count: number;
      tower_providers?: Array<{
        rat: string | null;
        provider: { country_id: number; provider_id: number };
      }>;
    };
  }

  interface CoverageGap {
    id: number;
    latitude: number;
    longitude: number;
    gap_confidence: number;
    gap_distance_m: number;
    dense_anomaly_score: number | null;
    tower_a_id: number | null;
    tower_b_id: number | null;
    tower_a_lat: number | null;
    tower_a_lng: number | null;
    tower_b_lat: number | null;
    tower_b_lng: number | null;
  }

  interface LeadStats {
    total: number;
    totalPopulation: number;
    totalUsers: number;
    avgConfidence: number;
    avgDistance: number;
    critical: number;
    high: number;
    new_leads: number;
    approved: number;
  }

  interface LeadVersion {
    run_id: string;
    carrier: string;
    model_version: string;
    created_at: string;
  }

  interface Lead {
    id: number;
    lead_id: string;
    lead_type: string;
    priority: string;
    priority_score: number;
    carrier: string;
    latitude: number;
    longitude: number;
    population: number | null;
    population_density: number | null;
    area_type: string | null;
    estimated_users: number | null;
    nearest_tower_distance_m: number | null;
    coverage_score: number | null;
    confidence: number;
    competitor_towers: number | null;
    tower_id: number | null;
    recommendation: string | null;
    status: string;
    created_at: string;
  }

  interface Props {
    // Anomaly data
    anomalyStats: AnomalyStats;
    anomalyVersions: ModelVersion[];
    anomalySelectedVersion: string;
    topAnomalies: AnomalyScore[];
    anomalyLoading: boolean;
    onAnomalyVersionChange: (version: string) => void;
    onAnomalyClick: (anomaly: AnomalyScore) => void;
    // Coverage gap data
    coverageGapStats: CoverageGapStats;
    coverageGapVersions: ModelVersion[];
    coverageGapSelectedVersion: string;
    topCoverageGaps: CoverageGap[];
    coverageGapLoading: boolean;
    onCoverageGapVersionChange: (version: string) => void;
    onCoverageGapClick: (gap: CoverageGap) => void;
    // Leads data
    leadStats?: LeadStats;
    leadStatsByType?: Record<string, { count: number; population: number; avgConfidence: number }>;
    leadVersions?: LeadVersion[];
    leadSelectedCarrier?: string | null;
    topLeads?: Lead[];
    leadsLoading?: boolean;
    onLeadCarrierChange?: (carrier: string) => void;
    onLeadClick?: (lead: Lead) => void;
  }

  let {
    anomalyStats,
    anomalyVersions,
    anomalySelectedVersion,
    topAnomalies,
    anomalyLoading,
    onAnomalyVersionChange,
    onAnomalyClick,
    coverageGapStats,
    coverageGapVersions,
    coverageGapSelectedVersion,
    topCoverageGaps,
    coverageGapLoading,
    onCoverageGapVersionChange,
    onCoverageGapClick,
    leadStats,
    leadStatsByType,
    leadVersions = [],
    leadSelectedCarrier,
    topLeads = [],
    leadsLoading = false,
    onLeadCarrierChange,
    onLeadClick,
  }: Props = $props();

  // Tab state
  type Tab = "gaps" | "anomalies" | "leads";
  let activeTab: Tab = $state("gaps");
  let showMethodology = $state(false);

  // Distance filter for coverage gaps
  let maxDistanceFilter = $state(5000); // meters
  const distanceOptions = [
    { value: 500, label: "< 500m" },
    { value: 1000, label: "< 1km" },
    { value: 2000, label: "< 2km" },
    { value: 5000, label: "< 5km" },
    { value: 10000, label: "< 10km" },
    { value: Infinity, label: "All" },
  ];

  // Filtered gaps based on distance
  let filteredGaps = $derived(
    topCoverageGaps.filter(g => g.gap_distance_m <= maxDistanceFilter)
  );

  // Dense-area gaps - use database score if available, otherwise calculate
  let rankedGaps = $derived(() => {
    const maxDist = 15000; // max distance for normalization
    return filteredGaps
      .map(gap => ({
        ...gap,
        denseScore: gap.dense_anomaly_score ??
          (gap.gap_confidence * (1 - Math.min(gap.gap_distance_m, maxDist) / maxDist))
      }))
      .sort((a, b) => b.denseScore - a.denseScore);
  });

  // Helpers
  function formatPercent(val: number): string {
    return (val * 100).toFixed(1) + "%";
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(1) + " km";
    }
    return meters.toFixed(0) + " m";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.99) return "#ef4444";
    if (confidence >= 0.95) return "#f97316";
    if (confidence >= 0.90) return "#f59e0b";
    return "#22c55e";
  }

  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.99) return "Critical";
    if (confidence >= 0.95) return "High";
    if (confidence >= 0.90) return "Medium";
    return "Low";
  }

  function getAnomalyColor(percentile: number): string {
    if (percentile >= 99) return "#ef4444";
    if (percentile >= 95) return "#f97316";
    if (percentile >= 90) return "#f59e0b";
    return "#22c55e";
  }

  function getAnomalyLabel(percentile: number): string {
    if (percentile >= 99) return "Critical";
    if (percentile >= 95) return "High";
    if (percentile >= 90) return "Elevated";
    return "Normal";
  }

  function getTowerCarrier(tower: AnomalyScore["tower"]): string {
    if (!tower.tower_providers || tower.tower_providers.length === 0) {
      return "Unknown";
    }
    const primary = tower.tower_providers[0].provider;
    return getCarrierName(primary.country_id, primary.provider_id);
  }

  // Stats derived
  let denseGapCount = $derived(topCoverageGaps.filter(g => g.gap_distance_m < 1000).length);
  let hasData = $derived(anomalyVersions.length > 0 || coverageGapVersions.length > 0 || leadVersions.length > 0);
  let hasLeadsData = $derived(leadVersions.length > 0);

  // Unique carriers from lead versions
  let uniqueCarriers = $derived(() => {
    const carriers = [...new Set(leadVersions.map(v => v.carrier))];
    return carriers.sort();
  });

  // Lead type labels and icons
  const leadTypeLabels: Record<string, { label: string; color: string }> = {
    coverage_gap: { label: "Coverage Gap", color: "#8b5cf6" },
    competitor_gap: { label: "Competitor Gap", color: "#f97316" },
    technology_gap: { label: "Tech Upgrade", color: "#3b82f6" },
    densification: { label: "Densification", color: "#22c55e" },
    backhaul_upgrade: { label: "Backhaul", color: "#06b6d4" },
    gnn_anomaly: { label: "GNN Anomaly", color: "#ef4444" },
  };

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "CRITICAL": return "#ef4444";
      case "HIGH": return "#f97316";
      case "MEDIUM": return "#f59e0b";
      case "LOW": return "#22c55e";
      default: return "#71717a";
    }
  }

  function formatNumber(num: number | null | undefined): string {
    if (num == null) return "-";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  }

  function getLeadTypeLabel(type: string): string {
    return leadTypeLabels[type]?.label || type;
  }

  function getLeadTypeColor(type: string): string {
    return leadTypeLabels[type]?.color || "#71717a";
  }
</script>

<div class="gnn-findings">
  <div class="section-header">
    <div class="title-area">
      <h2>GNN Findings</h2>
      <p class="description">Graph Neural Network analysis of tower topology - the model learns network patterns to predict where towers are missing</p>
      <button class="methodology-toggle" onclick={() => showMethodology = !showMethodology}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        {showMethodology ? "Hide" : "How it works"}
      </button>
    </div>
    {#if showMethodology}
      <div class="methodology-panel">
        <div class="method-section">
          <h4>How the GNN Works</h4>
          <p>
            The Graph Neural Network (GNN) learns patterns from the existing tower network topology.
            It treats towers as nodes and connects nearby towers (same carrier, within 20km) as edges.
            The model learns to predict whether connections <em>should</em> exist between tower pairs.
          </p>
        </div>
        <div class="method-grid">
          <div class="method-item">
            <span class="method-label">Coverage Gaps</span>
            <p>When the model predicts two towers should be connected but aren't, the midpoint between them
            is a "coverage gap" - a location where the network pattern suggests a tower should exist.</p>
          </div>
          <div class="method-item">
            <span class="method-label">Topology Anomalies</span>
            <p>Towers whose actual connections don't match what the model predicts. High anomaly scores
            indicate unusual network topology - could mean missing neighbors or data quality issues.</p>
          </div>
          <div class="method-item">
            <span class="method-label">Confidence Score</span>
            <p>How certain the model is about its prediction. Higher confidence = stronger evidence
            based on learned patterns from 211K+ towers and 2M+ connections.</p>
          </div>
          <div class="method-item">
            <span class="method-label">Validation Accuracy</span>
            <p>The model correctly predicts ~77% of held-out tower connections, demonstrating it has
            learned meaningful network patterns that generalize beyond the training data.</p>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if !hasData}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h3>No GNN Data Available</h3>
      <p>Run the GNN inference pipeline to generate coverage gap predictions and anomaly scores.</p>
    </div>
  {:else}
    <!-- Summary Stats Row -->
    <div class="summary-row">
      <div class="summary-card gaps" title="Locations where the GNN predicts a tower should exist based on network patterns">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="12" r="3"/>
            <circle cx="19" cy="12" r="3"/>
            <path d="M8 12h8" stroke-dasharray="2 2"/>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-value">{coverageGapStats.total.toLocaleString()}</div>
          <div class="summary-label">Coverage Gaps</div>
        </div>
        <div class="summary-detail">
          <span class="highlight">{denseGapCount}</span> in dense areas (&lt;1km)
        </div>
      </div>

      <div class="summary-card anomalies" title="Towers with unusual connectivity patterns that don't match learned network topology">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 22h20L12 2z"/>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-value">{anomalyStats.above99.toLocaleString()}</div>
          <div class="summary-label">Topology Anomalies</div>
        </div>
        <div class="summary-detail">
          <span class="highlight">{anomalyStats.above95.toLocaleString()}</span> above 95th percentile
        </div>
      </div>

      <div class="summary-card links" title="Tower pairs that should be connected based on network patterns but aren't in the graph">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-value">{coverageGapStats.missingLinks.toLocaleString()}</div>
          <div class="summary-label">Predicted Missing Links</div>
        </div>
        <div class="summary-detail">
          <span class="highlight">{formatPercent(coverageGapStats.avgLinkProbability)}</span> avg link probability
        </div>
      </div>

      {#if hasLeadsData && leadStats}
        <div class="summary-card leads">
          <div class="summary-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="summary-content">
            <div class="summary-value">{leadStats.total.toLocaleString()}</div>
            <div class="summary-label">Sales Leads</div>
          </div>
          <div class="summary-detail">
            <span class="highlight">{leadStats.critical + leadStats.high}</span> high priority
          </div>
        </div>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === "gaps"}
          onclick={() => activeTab = "gaps"}
        >
          <span class="tab-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
              <path d="M7 12h10" stroke-dasharray="2 2"/>
            </svg>
          </span>
          Coverage Gaps
          <span class="tab-count">{filteredGaps.length}</span>
        </button>
        <button
          class="tab"
          class:active={activeTab === "anomalies"}
          onclick={() => activeTab = "anomalies"}
        >
          <span class="tab-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 22h20L12 2z"/>
              <path d="M12 9v4"/>
            </svg>
          </span>
          Tower Anomalies
          <span class="tab-count">{topAnomalies.length}</span>
        </button>
        {#if hasLeadsData}
          <button
            class="tab"
            class:active={activeTab === "leads"}
            onclick={() => activeTab = "leads"}
          >
            <span class="tab-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </span>
            Sales Leads
            <span class="tab-count">{topLeads.length}</span>
          </button>
        {/if}
      </div>

      <!-- Model selector and filters -->
      <div class="controls">
        {#if activeTab === "gaps"}
          <div class="filter-group">
            <label>Distance:</label>
            <select bind:value={maxDistanceFilter}>
              {#each distanceOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          <div class="filter-group">
            <label>Model:</label>
            <select
              value={coverageGapSelectedVersion}
              onchange={(e) => onCoverageGapVersionChange((e.target as HTMLSelectElement).value)}
            >
              {#each coverageGapVersions as v}
                <option value={v.model_version}>{v.model_version}</option>
              {/each}
            </select>
          </div>
        {:else if activeTab === "anomalies"}
          <div class="filter-group">
            <label>Model:</label>
            <select
              value={anomalySelectedVersion}
              onchange={(e) => onAnomalyVersionChange((e.target as HTMLSelectElement).value)}
            >
              {#each anomalyVersions as v}
                <option value={v.model_version}>{v.model_version}</option>
              {/each}
            </select>
          </div>
        {:else if activeTab === "leads" && onLeadCarrierChange}
          <div class="filter-group">
            <label>Carrier:</label>
            <select
              value={leadSelectedCarrier || ""}
              onchange={(e) => onLeadCarrierChange((e.target as HTMLSelectElement).value)}
            >
              {#each uniqueCarriers() as carrier}
                <option value={carrier}>{carrier}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      {#if activeTab === "gaps"}
        {#if coverageGapLoading}
          <div class="skeleton-list">
            {#each Array(8) as _, i}
              <div class="skeleton-item">
                <div class="skeleton-rank"></div>
                <div class="skeleton-details">
                  <div class="skeleton-line wide"></div>
                  <div class="skeleton-line narrow"></div>
                </div>
                <div class="skeleton-badge"></div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="list-header">
            <span class="list-title">Coverage Gap Candidates</span>
            <span class="list-subtitle">
              Midpoints between tower pairs where the GNN predicts a connection should exist but doesn't.
              High confidence = model is certain a tower belongs here based on learned network patterns.
            </span>
          </div>
          <div class="gap-list">
            {#each rankedGaps().slice(0, 25) as gap, i}
              <button
                class="gap-item"
                onclick={() => onCoverageGapClick(gap)}
                style="--confidence-color: {getConfidenceColor(gap.gap_confidence)}"
              >
                <div class="rank">#{i + 1}</div>
                <div class="item-details">
                  <div class="location">
                    <span class="coords">
                      {gap.latitude.toFixed(4)}, {gap.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div class="meta">
                    <span class="distance">{formatDistance(gap.gap_distance_m)} gap</span>
                    {#if gap.tower_a_id && gap.tower_b_id}
                      <span class="towers">Between towers #{gap.tower_a_id} & #{gap.tower_b_id}</span>
                    {/if}
                  </div>
                </div>
                <div class="scores">
                  <div class="badge" style="background: {getConfidenceColor(gap.gap_confidence)}">
                    {getConfidenceLabel(gap.gap_confidence)}
                  </div>
                  <div class="score-text">
                    <span class="label">Conf:</span>
                    <span class="value">{formatPercent(gap.gap_confidence)}</span>
                  </div>
                </div>
              </button>
            {/each}
            {#if rankedGaps().length === 0}
              <div class="no-results">
                No gaps found with current filters. Try increasing the distance filter.
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        {#if anomalyLoading}
          <div class="skeleton-list">
            {#each Array(8) as _, i}
              <div class="skeleton-item">
                <div class="skeleton-rank"></div>
                <div class="skeleton-details">
                  <div class="skeleton-line wide"></div>
                  <div class="skeleton-line narrow"></div>
                </div>
                <div class="skeleton-badge"></div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="list-header">
            <span class="list-title">Topology Anomalies</span>
            <span class="list-subtitle">
              Towers where the GNN's predictions don't match reality - their connections are surprising given the
              learned network patterns. May indicate: missing neighbor towers, data quality issues, or unique infrastructure.
            </span>
          </div>
          <div class="anomaly-list">
            {#each topAnomalies.slice(0, 25) as anomaly, i}
              <button
                class="anomaly-item"
                onclick={() => onAnomalyClick(anomaly)}
                style="--severity-color: {getAnomalyColor(anomaly.percentile)}"
              >
                <div class="rank">#{i + 1}</div>
                <div class="item-details">
                  <div class="tower-info">
                    <span class="tower-id">Tower #{anomaly.tower_id}</span>
                    <span class="tower-type">{anomaly.tower.tower_type || "Unknown"}</span>
                  </div>
                  <div class="meta">
                    <span class="carrier">{getTowerCarrier(anomaly.tower)}</span>
                  </div>
                </div>
                <div class="scores">
                  <div class="badge" style="background: {getAnomalyColor(anomaly.percentile)}">
                    {getAnomalyLabel(anomaly.percentile)}
                  </div>
                  <div class="score-text">
                    <span class="label">Score:</span>
                    <span class="value">{formatPercent(anomaly.anomaly_score)}</span>
                  </div>
                </div>
              </button>
            {/each}
            {#if topAnomalies.length === 0}
              <div class="no-results">
                No anomalies found. Run the GNN inference pipeline to generate scores.
              </div>
            {/if}
          </div>
        {/if}
      {:else if activeTab === "leads"}
        {#if leadsLoading}
          <div class="skeleton-list">
            {#each Array(8) as _, i}
              <div class="skeleton-item">
                <div class="skeleton-rank"></div>
                <div class="skeleton-details">
                  <div class="skeleton-line wide"></div>
                  <div class="skeleton-line narrow"></div>
                </div>
                <div class="skeleton-badge"></div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Lead Type Summary -->
          {#if leadStatsByType && Object.keys(leadStatsByType).length > 0}
            <div class="lead-type-summary">
              {#each Object.entries(leadStatsByType).filter(([_, data]) => data.count > 0) as [type, data]}
                <div class="lead-type-card" style="--type-color: {getLeadTypeColor(type)}">
                  <div class="type-count">{data.count}</div>
                  <div class="type-label">{getLeadTypeLabel(type)}</div>
                  <div class="type-pop">{formatNumber(data.population)} pop</div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="list-header">
            <span class="list-title">Top Sales Leads</span>
            <span class="list-subtitle">Prioritized by population impact and confidence - click to view on map</span>
          </div>
          <div class="lead-list">
            {#each topLeads.slice(0, 25) as lead, i}
              <button
                class="lead-item"
                onclick={() => onLeadClick?.(lead)}
                style="--priority-color: {getPriorityColor(lead.priority)}"
              >
                <div class="rank">#{i + 1}</div>
                <div class="item-details">
                  <div class="lead-header">
                    <span class="lead-type-badge" style="background: {getLeadTypeColor(lead.lead_type)}">
                      {getLeadTypeLabel(lead.lead_type)}
                    </span>
                    <span class="lead-area-type">{lead.area_type || "Unknown"}</span>
                  </div>
                  <div class="lead-meta">
                    <span class="lead-pop">
                      <strong>{formatNumber(lead.estimated_users)}</strong> users
                    </span>
                    {#if lead.nearest_tower_distance_m}
                      <span class="lead-distance">{formatDistance(lead.nearest_tower_distance_m)} to tower</span>
                    {/if}
                  </div>
                  {#if lead.recommendation}
                    <div class="lead-recommendation">{lead.recommendation}</div>
                  {/if}
                </div>
                <div class="scores">
                  <div class="badge" style="background: {getPriorityColor(lead.priority)}">
                    {lead.priority}
                  </div>
                  <div class="score-text">
                    <span class="label">Conf:</span>
                    <span class="value">{formatPercent(lead.confidence)}</span>
                  </div>
                </div>
              </button>
            {/each}
            {#if topLeads.length === 0}
              <div class="no-results">
                No leads found for {leadSelectedCarrier || "this carrier"}. Run the lead generation pipeline.
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Run Info Footer -->
    <div class="run-info">
      {#if activeTab === "gaps"}
        <span class="info-label">Run ID:</span>
        <span class="info-value">{coverageGapStats.run_id || "N/A"}</span>
        <span class="separator">|</span>
        <span class="info-label">Created:</span>
        <span class="info-value">{formatDate(coverageGapStats.created_at)}</span>
        <span class="separator">|</span>
        <span class="info-label">Avg Gap:</span>
        <span class="info-value">{formatDistance(coverageGapStats.avgDistance)}</span>
      {:else if activeTab === "anomalies"}
        <span class="info-label">Run ID:</span>
        <span class="info-value">{anomalyStats.run_id || "N/A"}</span>
        <span class="separator">|</span>
        <span class="info-label">Created:</span>
        <span class="info-value">{formatDate(anomalyStats.created_at)}</span>
        <span class="separator">|</span>
        <span class="info-label">Total Scored:</span>
        <span class="info-value">{anomalyStats.total.toLocaleString()}</span>
      {:else if activeTab === "leads" && leadStats}
        <span class="info-label">Carrier:</span>
        <span class="info-value">{leadSelectedCarrier || "N/A"}</span>
        <span class="separator">|</span>
        <span class="info-label">Total Population:</span>
        <span class="info-value">{formatNumber(leadStats.totalPopulation)}</span>
        <span class="separator">|</span>
        <span class="info-label">Est. Users:</span>
        <span class="info-value">{formatNumber(leadStats.totalUsers)}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .gnn-findings {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .title-area h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f4f4f5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .description {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: #71717a;
  }

  .methodology-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: #27273a;
    border: 1px solid #3f3f5a;
    border-radius: 6px;
    color: #a1a1aa;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .methodology-toggle:hover {
    background: #2f2f42;
    color: #f4f4f5;
    border-color: #4f4f6a;
  }

  .methodology-panel {
    margin-top: 1rem;
    padding: 1rem;
    background: #27273a;
    border-radius: 8px;
    border: 1px solid #3f3f5a;
  }

  .method-section {
    margin-bottom: 1rem;
  }

  .method-section h4 {
    margin: 0 0 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .method-section p {
    margin: 0;
    font-size: 0.8125rem;
    color: #a1a1aa;
    line-height: 1.5;
  }

  .method-section em {
    color: #8b5cf6;
    font-style: normal;
    font-weight: 500;
  }

  .method-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .method-item {
    background: #1e1e2e;
    border-radius: 6px;
    padding: 0.75rem;
  }

  .method-label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #8b5cf6;
    margin-bottom: 0.375rem;
  }

  .method-item p {
    margin: 0;
    font-size: 0.75rem;
    color: #a1a1aa;
    line-height: 1.5;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-icon {
    color: #3f3f5a;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    color: #a1a1aa;
  }

  .empty-state p {
    margin: 0;
    color: #71717a;
    font-size: 0.875rem;
  }

  /* Summary Row */
  .summary-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .summary-card {
    background: #27273a;
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    border-left: 3px solid transparent;
  }

  .summary-card.gaps {
    border-left-color: #8b5cf6;
  }

  .summary-card.anomalies {
    border-left-color: #ef4444;
  }

  .summary-card.links {
    border-left-color: #3b82f6;
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    color: #a1a1aa;
  }

  .summary-content {
    flex: 1;
    min-width: 80px;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f4f4f5;
    line-height: 1;
  }

  .summary-label {
    font-size: 0.75rem;
    color: #71717a;
    margin-top: 0.25rem;
  }

  .summary-detail {
    width: 100%;
    font-size: 0.75rem;
    color: #71717a;
    padding-top: 0.5rem;
    border-top: 1px solid #3f3f5a;
    margin-top: 0.25rem;
  }

  .summary-detail .highlight {
    color: #f4f4f5;
    font-weight: 600;
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #27273a;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    background: #27273a;
    padding: 0.25rem;
    border-radius: 8px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: #a1a1aa;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #f4f4f5;
  }

  .tab.active {
    background: #3b82f6;
    color: white;
  }

  .tab-icon {
    display: flex;
    align-items: center;
  }

  .tab-count {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .tab.active .tab-count {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Controls */
  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.8125rem;
    color: #71717a;
  }

  .filter-group select {
    background: #27273a;
    border: 1px solid #3f3f5a;
    border-radius: 6px;
    padding: 0.375rem 0.625rem;
    color: #f4f4f5;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .filter-group select:focus {
    outline: none;
    border-color: #3b82f6;
  }

  /* Content */
  .content {
    margin-bottom: 1rem;
  }

  .list-header {
    margin-bottom: 0.75rem;
  }

  .list-title {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .list-subtitle {
    display: block;
    font-size: 0.8125rem;
    color: #71717a;
    margin-top: 0.25rem;
  }

  .gap-list,
  .anomaly-list,
  .lead-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 500px;
    overflow-y: auto;
  }

  .gap-item,
  .anomaly-item,
  .lead-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: #27273a;
    border: 1px solid transparent;
    border-left: 3px solid var(--confidence-color, var(--severity-color));
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    color: inherit;
    font: inherit;
  }

  .gap-item:hover,
  .anomaly-item:hover,
  .lead-item:hover {
    background: #2f2f42;
    border-color: var(--confidence-color, var(--severity-color, var(--priority-color)));
  }

  .lead-item {
    border-left-color: var(--priority-color, #71717a);
  }

  .rank {
    font-size: 0.875rem;
    font-weight: 600;
    color: #71717a;
    min-width: 2.5rem;
  }

  .item-details {
    flex: 1;
    min-width: 0;
  }

  .location,
  .tower-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .coords {
    font-weight: 500;
    color: #f4f4f5;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .tower-id {
    font-weight: 500;
    color: #f4f4f5;
  }

  .tower-type {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: #3f3f5a;
    border-radius: 4px;
    color: #a1a1aa;
  }

  .meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: #a1a1aa;
    margin-top: 0.25rem;
  }

  .distance {
    color: #8b5cf6;
    font-weight: 500;
  }

  .towers,
  .carrier {
    color: #71717a;
  }

  .scores {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
  }

  .score-text {
    font-size: 0.75rem;
    color: #71717a;
  }

  .score-text .label {
    margin-right: 0.25rem;
  }

  .score-text .value {
    color: #f4f4f5;
    font-weight: 500;
  }

  .loading,
  .no-results {
    text-align: center;
    padding: 2rem;
    color: #71717a;
    font-size: 0.875rem;
  }

  /* Run Info Footer */
  .run-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #71717a;
    padding: 0.75rem;
    background: #27273a;
    border-radius: 6px;
    flex-wrap: wrap;
  }

  .info-label {
    color: #a1a1aa;
  }

  .info-value {
    color: #f4f4f5;
    font-family: monospace;
  }

  .separator {
    color: #3f3f5a;
  }

  /* Leads-specific styles */
  .summary-card.leads {
    border-left: 3px solid #22c55e;
  }

  .summary-card.leads .summary-icon {
    color: #22c55e;
  }

  .lead-type-summary {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .lead-type-card {
    background: #27273a;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--type-color);
    min-width: 100px;
  }

  .type-count {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f4f4f5;
  }

  .type-label {
    font-size: 0.75rem;
    color: var(--type-color);
    font-weight: 600;
    margin-top: 0.125rem;
  }

  .type-pop {
    font-size: 0.6875rem;
    color: #71717a;
    margin-top: 0.25rem;
  }

  .lead-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .lead-type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
  }

  .lead-area-type {
    font-size: 0.75rem;
    color: #71717a;
    text-transform: capitalize;
  }

  .lead-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: #a1a1aa;
    flex-wrap: wrap;
  }

  .lead-pop {
    color: #f4f4f5;
  }

  .lead-pop strong {
    color: #22c55e;
    font-weight: 600;
  }

  .lead-distance {
    color: #8b5cf6;
  }

  .lead-recommendation {
    font-size: 0.75rem;
    color: #71717a;
    margin-top: 0.375rem;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  @media (max-width: 768px) {
    .summary-row {
      grid-template-columns: 1fr;
    }

    .tabs-container {
      flex-direction: column;
      align-items: stretch;
    }

    .controls {
      justify-content: flex-end;
    }
  }

  /* Skeleton Loading */
  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: #27273a;
    border-radius: 6px;
    border-left: 3px solid #3f3f5a;
  }

  .skeleton-rank {
    width: 2rem;
    height: 1rem;
    background: linear-gradient(90deg, #3f3f5a 25%, #4a4a6a 50%, #3f3f5a 75%);
    background-size: 200% 100%;
    border-radius: 4px;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-line {
    height: 0.875rem;
    background: linear-gradient(90deg, #3f3f5a 25%, #4a4a6a 50%, #3f3f5a 75%);
    background-size: 200% 100%;
    border-radius: 4px;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-line.wide {
    width: 70%;
  }

  .skeleton-line.narrow {
    width: 40%;
  }

  .skeleton-badge {
    width: 4rem;
    height: 1.5rem;
    background: linear-gradient(90deg, #3f3f5a 25%, #4a4a6a 50%, #3f3f5a 75%);
    background-size: 200% 100%;
    border-radius: 4px;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-item:nth-child(2) .skeleton-rank,
  .skeleton-item:nth-child(2) .skeleton-line,
  .skeleton-item:nth-child(2) .skeleton-badge { animation-delay: 0.1s; }

  .skeleton-item:nth-child(3) .skeleton-rank,
  .skeleton-item:nth-child(3) .skeleton-line,
  .skeleton-item:nth-child(3) .skeleton-badge { animation-delay: 0.2s; }

  .skeleton-item:nth-child(4) .skeleton-rank,
  .skeleton-item:nth-child(4) .skeleton-line,
  .skeleton-item:nth-child(4) .skeleton-badge { animation-delay: 0.3s; }

  .skeleton-item:nth-child(5) .skeleton-rank,
  .skeleton-item:nth-child(5) .skeleton-line,
  .skeleton-item:nth-child(5) .skeleton-badge { animation-delay: 0.4s; }

  .skeleton-item:nth-child(6) .skeleton-rank,
  .skeleton-item:nth-child(6) .skeleton-line,
  .skeleton-item:nth-child(6) .skeleton-badge { animation-delay: 0.5s; }

  .skeleton-item:nth-child(7) .skeleton-rank,
  .skeleton-item:nth-child(7) .skeleton-line,
  .skeleton-item:nth-child(7) .skeleton-badge { animation-delay: 0.6s; }

  .skeleton-item:nth-child(8) .skeleton-rank,
  .skeleton-item:nth-child(8) .skeleton-line,
  .skeleton-item:nth-child(8) .skeleton-badge { animation-delay: 0.7s; }
</style>
