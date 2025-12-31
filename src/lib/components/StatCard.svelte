<script lang="ts">
  interface Props {
    title: string;
    value: number | string;
    icon?: string;
    color?: string;
  }

  let { title, value, icon = "", color = "#3b82f6" }: Props = $props();
</script>

<div class="stat-card" style="--accent-color: {color}">
  <div class="stat-icon">{icon}</div>
  <div class="stat-content">
    <h3>{title}</h3>
    <p class="stat-value">{typeof value === "number" ? value.toLocaleString() : value}</p>
  </div>
</div>

<style>
  .stat-card {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-left: 4px solid var(--accent-color);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .stat-icon {
    font-size: 2rem;
    opacity: 0.9;
  }

  .stat-content h3 {
    margin: 0;
    font-size: 0.875rem;
    color: #a1a1aa;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    margin: 0.25rem 0 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #f4f4f5;
  }
</style>
