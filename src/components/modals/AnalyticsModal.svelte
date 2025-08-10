<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsStore, type TokenUsage } from '../../stores/analytics';
  import Modal from './Modal.svelte';
  import { BarChart2, TrendingUp, DollarSign, Activity, Zap } from 'lucide-svelte';
  import { Line } from 'svelte-chartjs';
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Filler,
  } from 'chart.js';

  ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler);

  let usageData: TokenUsage[] = [];
  let filteredData: TokenUsage[] = [];
  let period: 'day' | 'week' | 'month' = 'day';
  let chartData: any;
  let totalTokens = 0;
  let defaultExpense = 0;
  let reasoningExpense = 0;

  const MODEL_PRICES = {
    Default: { input: 0.88 / 1_000_000, output: 0.88 / 1_000_000 },
    Reasoning: { input: 0.20 / 1_000_000, output: 0.60 / 1_000_000 },
  };

  function closeModal() {
    analyticsStore.closeAnalyticsModal();
  }

  function setPeriod(p: 'day' | 'week' | 'month') {
    period = p;
    filterData();
    updateChartColors();
  }

  function filterData() {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let startTime: number;

    if (period === 'day') {
      startTime = now.getTime() - oneDay;
    } else if (period === 'week') {
      startTime = now.getTime() - oneWeek;
    } else {
      startTime = now.getTime() - oneMonth;
    }

    filteredData = usageData.filter(d => d.timestamp >= startTime);
    updateChart();
    calculateTotals();
  }

  function calculateTotals() {
    totalTokens = filteredData.reduce((acc, d) => acc + d.outputTokens, 0);
    defaultExpense = 0;
    reasoningExpense = 0;

    filteredData.forEach(d => {
      const prices = MODEL_PRICES[d.model as keyof typeof MODEL_PRICES] || { input: 0, output: 0 };
      const expense = (d.inputTokens * prices.input) + (d.outputTokens * prices.output);
      if (d.model === 'Default') {
        defaultExpense += expense;
      } else if (d.model === 'Reasoning') {
        reasoningExpense += expense;
      }
    });
  }

  function updateChart() {
    const labels = filteredData.map(d => new Date(d.timestamp).toLocaleTimeString());
    const data = filteredData.map(d => d.outputTokens);

    chartData = {
      labels,
      datasets: [
        {
          label: 'Token Usage',
          data,
          borderColor: 'var(--primary-color)',
          backgroundColor: 'var(--primary-color-alpha)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: 'var(--primary-color)',
          pointBorderColor: 'var(--background-color)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'var(--surface-color)',
        titleColor: 'var(--text-color)',
        bodyColor: 'var(--text-color)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'var(--border-color)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-muted)',
          font: { size: 11 },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'var(--border-color)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-muted)',
          font: { size: 11 },
        },
      },
    },
  };

  let chartContainer: HTMLElement;

  function updateChartColors() {
    if (!chartContainer) return;

    const style = getComputedStyle(chartContainer);
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    const primaryColorAlpha = style.getPropertyValue('--primary-color-translucent').trim();
    const backgroundColor = style.getPropertyValue('--background-color').trim();
    const textColor = style.getPropertyValue('--text-color').trim();
    const textMutedColor = style.getPropertyValue('--text-muted').trim();
    const borderColor = style.getPropertyValue('--border-color').trim();
    const surfaceColor = style.getPropertyValue('--surface-color').trim();

    if (chartData && chartData.datasets) {
        chartData.datasets[0].borderColor = primaryColor;
        chartData.datasets[0].backgroundColor = primaryColorAlpha;
        chartData.datasets[0].pointBackgroundColor = primaryColor;
        chartData.datasets[0].pointBorderColor = backgroundColor;
    }

    if (chartOptions) {
        chartOptions.plugins.tooltip.backgroundColor = surfaceColor;
        chartOptions.plugins.tooltip.titleColor = textColor;
        chartOptions.plugins.tooltip.bodyColor = textColor;
        chartOptions.plugins.tooltip.borderColor = borderColor;
        chartOptions.scales.x.grid.color = borderColor;
        chartOptions.scales.x.ticks.color = textMutedColor;
        chartOptions.scales.y.grid.color = borderColor;
        chartOptions.scales.y.ticks.color = textMutedColor;
    }
  }

  onMount(() => {
    const unsubscribe = analyticsStore.subscribe(state => {
      usageData = state.tokenUsage;
      filterData();
      updateChartColors();
    });

    return unsubscribe;
  });
</script>

<Modal isOpen={$analyticsStore.isAnalyticsModalOpen} on:close={closeModal} title="Usage Analytics" modalClass="analytics-modal">
  <div class="analytics-content" bind:this={chartContainer}>
    <!-- Header Section -->
    <div class="header">
      <div class="header-icon">
        <BarChart2 size={20} />
      </div>
      <div class="header-text">
        <h2>Usage Analytics</h2>
        <p class="subtitle">Monitor your API usage and costs</p>
      </div>
    </div>

    <!-- Period Selector -->
    <div class="period-selector">
      <button 
        class:active={period === 'day'} 
        on:click={() => setPeriod('day')}
      >
        Day
      </button>
      <button 
        class:active={period === 'week'} 
        on:click={() => setPeriod('week')}
      >
        Week
      </button>
      <button 
        class:active={period === 'month'} 
        on:click={() => setPeriod('month')}
      >
        Month
      </button>
    </div>

    <!-- Chart Section -->
    <div class="chart-section">
      <h3 class="section-title">Token Usage Trend</h3>
      <div class="chart-container">
        {#if chartData && chartData.datasets[0].data.length > 0}
          <Line data={chartData} options={chartOptions} />
        {:else}
          <div class="no-data">
            <TrendingUp size={32} />
            <span>No usage data available for the selected period</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Metrics Section -->
    <div class="metrics-section">
      <h3 class="section-title">Usage Summary</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">
            <Activity size={18} />
          </div>
          <div class="metric-content">
            <div class="metric-value">{totalTokens.toLocaleString()}</div>
            <div class="metric-label">Total Tokens Used</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <DollarSign size={18} />
          </div>
          <div class="metric-content">
            <div class="metric-value">${defaultExpense.toFixed(6)}</div>
            <div class="metric-label">Default Model Expense</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <Zap size={18} />
          </div>
          <div class="metric-content">
            <div class="metric-value">${reasoningExpense.toFixed(6)}</div>
            <div class="metric-label">Reasoning Model Expense</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer">
      <p>
        <strong>Note:</strong> Token estimation and calculations are precise and calibrated with our pricing model. 
        It may slightly differ with Provider's API pricing.
      </p>
    </div>
  </div>
</Modal>

<style>
  :global(.analytics-modal) {
    --modal-width: min(800px, 90vw);
    --modal-max-width: 800px;
  }

  .analytics-content {
    padding: 0;
  }

  /* Header Section */
  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .header-icon {
    width: 40px;
    height: 40px;
    background: var(--primary-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .header-text {
    flex: 1;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Period Selector */
  .period-selector {
    display: flex;
    gap: 0.5rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .period-selector button {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .period-selector button:hover {
    background: var(--hover-color);
    border-color: var(--primary-color);
  }

  .period-selector button.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  /* Section Titles */
  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 1rem 0;
  }

  /* Chart Section */
  .chart-section {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .chart-container {
    height: 300px;
    background: var(--surface-color);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    padding: 1rem;
    position: relative;
  }

  .no-data {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    font-size: 0.875rem;
  }

  /* Metrics Section */
  .metrics-section {
    padding: 1.5rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .metric-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s ease;
  }

  .metric-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .metric-icon {
    width: 36px;
    height: 36px;
    background: var(--primary-color);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .metric-content {
    flex: 1;
    min-width: 0;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    line-height: 1.2;
    margin-bottom: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Disclaimer */
  .disclaimer {
    padding: 1.5rem;
    text-align: center;
    border-top: 1px solid var(--border-color);
    background: var(--surface-color);
  }

  .disclaimer p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .disclaimer strong {
    color: var(--text-color);
    font-weight: 600;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    :global(.analytics-modal) {
      --modal-width: 95vw;
      --modal-max-width: 95vw;
    }

    .header {
      padding: 1.25rem;
    }

    .header-icon {
      width: 36px;
      height: 36px;
    }

    h2 {
      font-size: 1.125rem;
    }

    .period-selector {
      padding: 1.25rem;
      flex-wrap: wrap;
    }

    .period-selector button {
      flex: 1;
      min-width: 80px;
    }

    .chart-section {
      padding: 1.25rem;
    }

    .chart-container {
      height: 250px;
      padding: 0.75rem;
    }

    .metrics-section {
      padding: 1.25rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .metric-card {
      padding: 1rem;
    }

    .metric-icon {
      width: 32px;
      height: 32px;
    }

    .metric-value {
      font-size: 1.125rem;
    }

    .disclaimer {
      padding: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    .header {
      padding: 1rem;
    }

    .period-selector {
      padding: 1rem;
    }

    .chart-section {
      padding: 1rem;
    }

    .metrics-section {
      padding: 1rem;
    }

    .disclaimer {
      padding: 1rem;
    }

    .chart-container {
      height: 220px;
    }
  }
</style>