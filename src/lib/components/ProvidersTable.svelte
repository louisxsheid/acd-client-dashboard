<script lang="ts">
  import { getCarrierName, getCarrierColor } from "../carriers";

  interface Provider {
    id: number;
    country_id: number;
    provider_id: number;
    name: string | null;
    visible: boolean;
    tower_providers_aggregate: {
      aggregate: {
        count: number;
      };
    };
    lte_tower_providers: {
      aggregate: {
        count: number;
      };
    };
    nr_tower_providers: {
      aggregate: {
        count: number;
      };
    };
  }

  interface Props {
    providers: Provider[];
  }

  let { providers }: Props = $props();

  let sortedProviders = $derived(
    [...providers].sort(
      (a, b) => b.tower_providers_aggregate.aggregate.count - a.tower_providers_aggregate.aggregate.count
    )
  );
</script>

<div class="providers-table">
  <h3>Carriers</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Carrier</th>
          <th>MCC-MNC</th>
          <th class="right">Towers</th>
          <th class="right">LTE</th>
          <th class="right">5G NR</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedProviders as provider}
          {@const carrierName = getCarrierName(provider.country_id, provider.provider_id)}
          {@const carrierColor = getCarrierColor(provider.country_id, provider.provider_id)}
          <tr>
            <td class="name">
              <span class="carrier-dot" style="background: {carrierColor}"></span>
              {carrierName}
            </td>
            <td class="mcc-mnc">{provider.country_id}-{provider.provider_id}</td>
            <td class="towers right">{provider.tower_providers_aggregate.aggregate.count.toLocaleString()}</td>
            <td class="right">{provider.lte_tower_providers.aggregate.count.toLocaleString()}</td>
            <td class="right">{provider.nr_tower_providers.aggregate.count.toLocaleString()}</td>
            <td>
              <span class="status" class:visible={provider.visible}>
                {provider.visible ? "Active" : "Hidden"}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .providers-table {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
    overflow: hidden;
  }

  h3 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 0.75rem;
    font-size: 0.75rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #27273a;
  }

  th.right {
    text-align: right;
  }

  td {
    padding: 0.75rem;
    font-size: 0.875rem;
    color: #e4e4e7;
    border-bottom: 1px solid #27273a;
  }

  td.right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #27273a;
  }

  .name {
    font-weight: 500;
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

  .mcc-mnc {
    font-family: monospace;
    color: #71717a;
    font-size: 0.8rem;
  }

  .towers {
    font-weight: 600;
    color: #3b82f6;
  }

  .status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #27273a;
    color: #71717a;
  }

  .status.visible {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }
</style>
