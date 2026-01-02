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
    background: #253448;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-left: 4px solid var(--accent-color);
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .stat-icon {
    font-size: 1.5rem;
    opacity: 0.9;
    flex-shrink: 0;
  }

  .stat-content {
    min-width: 0;
    overflow: hidden;
  }

  .stat-content h3 {
    margin: 0;
    font-size: 0.7rem;
    color: #a1a1aa;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-value {
    margin: 0.125rem 0 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f4f4f5;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .stat-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .stat-content h3 {
      font-size: 0.65rem;
    }

    .stat-value {
      font-size: 1.25rem;
    }
  }
</style>
