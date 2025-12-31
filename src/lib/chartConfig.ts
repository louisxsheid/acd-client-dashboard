// Shared Chart.js configuration for consistent styling across the dashboard

export const chartColors = {
  background: "#1e1e2e",
  surface: "#27273a",
  border: "#3b3b50",
  text: {
    primary: "#f4f4f5",
    secondary: "#a1a1aa",
    muted: "#71717a",
  },
  grid: "#27273a",
  gridLight: "#3b3b50",
};

export const chartFonts = {
  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: {
    xs: 10,
    sm: 11,
    md: 12,
    lg: 14,
  },
};

// Common tooltip configuration
export const tooltipConfig = {
  backgroundColor: chartColors.surface,
  titleColor: chartColors.text.primary,
  bodyColor: chartColors.text.secondary,
  borderColor: chartColors.border,
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  titleFont: {
    size: chartFonts.size.md,
    weight: "bold" as const,
  },
  bodyFont: {
    size: chartFonts.size.sm,
  },
  displayColors: true,
  boxPadding: 4,
};

// Common legend configuration
export const legendConfig = {
  labels: {
    color: chartColors.text.secondary,
    padding: 16,
    usePointStyle: true,
    font: {
      size: chartFonts.size.sm,
    },
  },
};

// Common grid configuration for scales
export const gridConfig = {
  color: chartColors.grid,
  lineWidth: 1,
};

// Common tick configuration
export const tickConfig = {
  color: chartColors.text.muted,
  font: {
    size: chartFonts.size.xs,
  },
};

// Horizontal bar chart defaults
export const horizontalBarDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y" as const,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: tooltipConfig,
  },
  scales: {
    x: {
      grid: gridConfig,
      ticks: {
        ...tickConfig,
        callback: function(value: number | string) {
          return Number(value).toLocaleString();
        },
      },
    },
    y: {
      grid: {
        display: false,
      },
      ticks: {
        color: chartColors.text.secondary,
        font: {
          size: chartFonts.size.sm,
        },
      },
    },
  },
};

// Vertical bar chart defaults
export const verticalBarDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: tooltipConfig,
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: chartColors.text.muted,
        font: {
          size: chartFonts.size.sm,
        },
      },
    },
    y: {
      grid: gridConfig,
      ticks: {
        ...tickConfig,
        callback: function(value: number | string) {
          return Number(value).toLocaleString();
        },
      },
    },
  },
};

// Doughnut/Pie chart defaults
export const doughnutDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "60%",
  plugins: {
    legend: {
      position: "right" as const,
      ...legendConfig,
    },
    tooltip: tooltipConfig,
  },
};

// Radar chart defaults
export const radarDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "bottom" as const,
      ...legendConfig,
    },
    tooltip: tooltipConfig,
  },
  scales: {
    r: {
      angleLines: {
        color: chartColors.gridLight,
        lineWidth: 1,
      },
      grid: {
        color: chartColors.grid,
        lineWidth: 1,
      },
      pointLabels: {
        color: chartColors.text.primary,
        font: {
          size: chartFonts.size.lg,
          weight: "600" as const,
        },
      },
      ticks: {
        display: false,
        stepSize: 5,
      },
      suggestedMin: 0,
      suggestedMax: 20,
    },
  },
};

// Bar chart style helpers
export function createBarDataset(
  data: number[],
  colors: string[],
  options: { borderRadius?: number; barThickness?: number } = {}
) {
  return {
    data,
    backgroundColor: colors,
    borderColor: colors,
    borderWidth: 0,
    borderRadius: options.borderRadius ?? 4,
    barThickness: options.barThickness,
  };
}

// Stacked bar chart configuration
export const stackedBarDefaults = {
  ...horizontalBarDefaults,
  plugins: {
    ...horizontalBarDefaults.plugins,
    legend: {
      position: "bottom" as const,
      ...legendConfig,
    },
  },
  scales: {
    x: {
      ...horizontalBarDefaults.scales.x,
      stacked: true,
    },
    y: {
      ...horizontalBarDefaults.scales.y,
      stacked: true,
    },
  },
};
