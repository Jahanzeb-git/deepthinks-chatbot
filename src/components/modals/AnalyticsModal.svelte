<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { analyticsStore, type TimeseriesEntry } from '../../stores/analytics';
  import Modal from './Modal.svelte';
  import { BarChart2, TrendingUp, DollarSign, Activity, Zap, RefreshCw, Calendar, Layers } from 'lucide-svelte';
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

  // Pricing per million tokens
  const PRICING = {
    default: {
      input: 0.20,  // $0.20 per 1M input tokens
      output: 0.60, // $0.60 per 1M output tokens
    },
    code: {
      rate: 2.00, // $2.00 per 1M total tokens
    },
  };

  let chartData: any = null;
  let chartKey = 0; // Force re-render for animations
  let isAnimating = false;

  // Chart colors - beautiful gradient palette
  const COLORS = {
    input: {
      main: 'rgb(129, 140, 248)',      // Soft indigo
      light: 'rgba(129, 140, 248, 0.1)',
    },
    output: {
      main: 'rgb(52, 211, 153)',       // Emerald green
      light: 'rgba(52, 211, 153, 0.1)',
    },
    total: {
      main: 'rgb(251, 146, 60)',       // Warm orange
      light: 'rgba(251, 146, 60, 0.1)',
    },
  };

  function closeModal() {
    analyticsStore.closeAnalyticsModal();
  }

  function handlePeriodChange(period: '7d' | '30d' | '90d' | 'all') {
    if ($analyticsStore.period !== period) {
      triggerAnimation();
      analyticsStore.setPeriod(period);
    }
  }

  function handleGroupByChange(groupBy: 'day' | 'week' | 'month') {
    if ($analyticsStore.groupBy !== groupBy) {
      triggerAnimation();
      analyticsStore.setGroupBy(groupBy);
    }
  }

  function triggerAnimation() {
    isAnimating = true;
    chartKey++;
    setTimeout(() => {
      isAnimating = false;
    }, 1000);
  }

  function formatDate(dateStr: string, groupBy: 'day' | 'week' | 'month'): string {
    const date = new Date(dateStr);
    if (groupBy === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else if (groupBy === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  // Calculate cost for default model (input + output pricing)
  function calculateDefaultCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * PRICING.default.input;
    const outputCost = (outputTokens / 1_000_000) * PRICING.default.output;
    return inputCost + outputCost;
  }

  // Calculate cost for code model (flat rate per total tokens)
  // Note: Since backend doesn't separate by model, we show both calculations
  function calculateCodeCost(totalTokens: number): number {
    return (totalTokens / 1_000_000) * PRICING.code.rate;
  }

  function formatCurrency(amount: number): string {
    if (amount < 0.01) {
      return '$' + amount.toFixed(6);
    } else if (amount < 1) {
      return '$' + amount.toFixed(4);
    }
    return '$' + amount.toFixed(2);
  }

  function buildChartData(timeseries: TimeseriesEntry[]) {
    if (!timeseries || timeseries.length === 0) {
      chartData = null;
      return;
    }

    const labels = timeseries.map(entry => formatDate(entry.date, $analyticsStore.groupBy));
    const inputData = timeseries.map(entry => entry.input_tokens);
    const outputData = timeseries.map(entry => entry.output_tokens);
    const totalData = timeseries.map(entry => entry.total_tokens);

    chartData = {
      labels,
      datasets: [
        {
          label: 'Input Tokens',
          data: inputData,
          borderColor: COLORS.input.main,
          backgroundColor: COLORS.input.light,
          fill: false,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.input.main,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: COLORS.input.main,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Output Tokens',
          data: outputData,
          borderColor: COLORS.output.main,
          backgroundColor: COLORS.output.light,
          fill: false,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.output.main,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: COLORS.output.main,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Total Tokens',
          data: totalData,
          borderColor: COLORS.total.main,
          backgroundColor: COLORS.total.light,
          fill: false,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.total.main,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: COLORS.total.main,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
    
    chartKey++;
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            family: "'Inter', system-ui, sans-serif",
            weight: '500',
          },
          color: 'var(--text-muted)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        titleFont: { size: 13, weight: '600' as const, family: "'Inter', system-ui, sans-serif" },
        bodyFont: { size: 12, family: "'Inter', system-ui, sans-serif" },
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: function(context: any) {
            return ` ${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'var(--text-muted)',
          font: { size: 11, family: "'Inter', system-ui, sans-serif" },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'var(--text-muted)',
          font: { size: 11, family: "'Inter', system-ui, sans-serif" },
          callback: function(value: any) {
            return formatNumber(value);
          },
          padding: 8,
        },
      },
    },
  };

  $: if ($analyticsStore.data?.timeseries) {
    buildChartData($analyticsStore.data.timeseries);
  }

  $: summary = $analyticsStore.data?.summary;
  $: defaultCost = summary ? calculateDefaultCost(summary.total_input_tokens, summary.total_output_tokens) : 0;
  $: codeCost = summary ? calculateCodeCost(summary.total_tokens) : 0;

  function getPeriodLabel(period: '7d' | '30d' | '90d'): string {
    switch (period) {
      case '7d': return '7 Days';
      case '30d': return '30 Days';
      case '90d': return '90 Days';
    }
  }

  function getGroupByLabel(groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
    }
  }
</script>

<Modal isOpen={$analyticsStore.isAnalyticsModalOpen} on:close={closeModal} title="Usage Analytics" modalClass="analytics-modal">
  <div class="analytics-content">
    <!-- Header Section -->
    <header class="analytics-header">
      <div class="header-left">
        <h2>Usage Analytics</h2>
        <p class="subtitle">Token usage and estimated costs</p>
      </div>
      <button class="refresh-btn" on:click={() => analyticsStore.refresh()} disabled={$analyticsStore.isLoading}>
        <RefreshCw size={16} class={$analyticsStore.isLoading ? 'spinning' : ''} />
      </button>
    </header>

    <!-- Controls Section -->
    <div class="controls-section">
      <div class="control-group">
        <div class="control-label">
          <Calendar size={14} />
          <span>Period</span>
        </div>
        <div class="period-selector">
          <button 
            class:active={$analyticsStore.period === '7d'} 
            on:click={() => handlePeriodChange('7d')}
          >
            7D
          </button>
          <button 
            class:active={$analyticsStore.period === '30d'} 
            on:click={() => handlePeriodChange('30d')}
          >
            30D
          </button>
          <button 
            class:active={$analyticsStore.period === '90d'} 
            on:click={() => handlePeriodChange('90d')}
          >
            90D
          </button>
          <button 
            class:active={$analyticsStore.period === 'all'} 
            on:click={() => handlePeriodChange('all')}
          >
            All
          </button>
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">
          <Layers size={14} />
          <span>Group</span>
        </div>
        <div class="period-selector">
          <button 
            class:active={$analyticsStore.groupBy === 'day'} 
            on:click={() => handleGroupByChange('day')}
          >
            Day
          </button>
          <button 
            class:active={$analyticsStore.groupBy === 'week'} 
            on:click={() => handleGroupByChange('week')}
          >
            Week
          </button>
          <button 
            class:active={$analyticsStore.groupBy === 'month'} 
            on:click={() => handleGroupByChange('month')}
          >
            Month
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="chart-section">
      <div class="chart-header">
        <h3>Token Usage Over Time</h3>
        <div class="legend-inline">
          <span class="legend-item">
            <span class="legend-dot input"></span>
            Input
          </span>
          <span class="legend-item">
            <span class="legend-dot output"></span>
            Output
          </span>
          <span class="legend-item">
            <span class="legend-dot total"></span>
            Total
          </span>
        </div>
      </div>
      <div class="chart-container" class:loading={$analyticsStore.isLoading}>
        {#if $analyticsStore.isLoading}
          <div class="chart-loading">
            <div class="loading-shimmer"></div>
          </div>
        {:else if $analyticsStore.error}
          <div class="chart-error">
            <TrendingUp size={32} />
            <span>{$analyticsStore.error}</span>
          </div>
        {:else if chartData && chartData.datasets[0]?.data?.length > 0}
          {#key chartKey}
            <Line data={chartData} options={chartOptions} />
          {/key}
        {:else}
          <div class="chart-empty">
            <TrendingUp size={32} />
            <span>No usage data for the selected period</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-section">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon activity">
            <Activity size={18} />
          </div>
          <div class="metric-content">
            <span class="metric-value">{summary ? formatNumber(summary.total_tokens) : '—'}</span>
            <span class="metric-label">Total Tokens</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon interactions">
            <Zap size={18} />
          </div>
          <div class="metric-content">
            <span class="metric-value">{summary ? summary.total_interactions.toLocaleString() : '—'}</span>
            <span class="metric-label">Interactions</span>
          </div>
        </div>

        <div class="metric-card highlight">
          <div class="metric-icon cost">
            <DollarSign size={18} />
          </div>
          <div class="metric-content">
            <span class="metric-value">{formatCurrency(defaultCost)}</span>
            <span class="metric-label">Default LLM Cost</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon code-cost">
            <BarChart2 size={18} />
          </div>
          <div class="metric-content">
            <span class="metric-value">{formatCurrency(codeCost)}</span>
            <span class="metric-label">Code LLM Cost</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Token Breakdown -->
    <div class="breakdown-section">
      <h4>Token Breakdown</h4>
      <div class="breakdown-grid">
        <div class="breakdown-item">
          <span class="breakdown-dot input"></span>
          <span class="breakdown-label">Input Tokens</span>
          <span class="breakdown-value">{summary ? formatNumber(summary.total_input_tokens) : '—'}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-dot output"></span>
          <span class="breakdown-label">Output Tokens</span>
          <span class="breakdown-value">{summary ? formatNumber(summary.total_output_tokens) : '—'}</span>
        </div>
      </div>
    </div>

    <!-- Pricing Info -->
    <div class="pricing-info">
      <div class="pricing-card">
        <span class="pricing-title">Default LLM Pricing</span>
        <span class="pricing-detail">$0.20/M input · $0.60/M output</span>
      </div>
      <div class="pricing-card">
        <span class="pricing-title">Code LLM Pricing</span>
        <span class="pricing-detail">$2.00/M tokens</span>
      </div>
    </div>
  </div>
</Modal>

<style>
  :global(.analytics-modal) {
    --modal-width: min(680px, 92vw);
    --modal-max-width: 680px;
  }

  .analytics-content {
    padding: 0;
  }

  /* Header */
  .analytics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .header-left h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-color);
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
  }

  .refresh-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
    border-color: var(--primary-color);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.refresh-btn .spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Controls */
  .controls-section {
    display: flex;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--surface-color);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .control-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .period-selector {
    display: flex;
    background: var(--background-color);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }

  .period-selector button {
    background: transparent;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .period-selector button:hover {
    color: var(--text-color);
    background: var(--hover-color);
  }

  .period-selector button.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 1px 3px rgba(102, 126, 234, 0.3);
  }

  /* Chart Section */
  .chart-section {
    padding: 1.5rem;
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .chart-header h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }

  .legend-inline {
    display: flex;
    gap: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .legend-dot.input { background: rgb(129, 140, 248); }
  .legend-dot.output { background: rgb(52, 211, 153); }
  .legend-dot.total { background: rgb(251, 146, 60); }

  .chart-container {
    height: 260px;
    background: var(--surface-color);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    padding: 1rem;
    position: relative;
    transition: opacity 0.2s ease;
  }

  .chart-container.loading {
    opacity: 0.7;
  }

  .chart-loading,
  .chart-error,
  .chart-empty {
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

  .loading-shimmer {
    width: 60%;
    height: 4px;
    background: linear-gradient(90deg, var(--border-color) 25%, var(--hover-color) 50%, var(--border-color) 75%);
    background-size: 200% 100%;
    border-radius: 4px;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Metrics Section */
  .metrics-section {
    padding: 0 1.5rem 1.5rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .metric-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.2s ease;
  }

  .metric-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .metric-card.highlight {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.02) 100%);
    border-color: rgba(102, 126, 234, 0.3);
  }

  .metric-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .metric-icon.activity { background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); }
  .metric-icon.interactions { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }
  .metric-icon.cost { background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); }
  .metric-icon.code-cost { background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); }

  .metric-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .metric-label {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* Breakdown Section */
  .breakdown-section {
    padding: 0 1.5rem 1.5rem;
  }

  .breakdown-section h4 {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.75rem 0;
  }

  .breakdown-grid {
    display: flex;
    gap: 1.5rem;
  }

  .breakdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .breakdown-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .breakdown-dot.input { background: rgb(129, 140, 248); }
  .breakdown-dot.output { background: rgb(52, 211, 153); }

  .breakdown-label {
    color: var(--text-muted);
  }

  .breakdown-value {
    font-weight: 600;
    color: var(--text-color);
    font-variant-numeric: tabular-nums;
  }

  /* Pricing Info */
  .pricing-info {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: var(--surface-color);
    border-top: 1px solid var(--border-color);
  }

  .pricing-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background: var(--background-color);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .pricing-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .pricing-detail {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    :global(.analytics-modal) {
      --modal-width: 95vw;
      --modal-max-width: 95vw;
    }

    .analytics-header {
      padding: 1rem 1.25rem;
    }

    .controls-section {
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
    }

    .chart-section {
      padding: 1.25rem;
    }

    .chart-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .chart-container {
      height: 220px;
    }

    .metrics-section {
      padding: 0 1.25rem 1.25rem;
    }

    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .breakdown-section {
      padding: 0 1.25rem 1.25rem;
    }

    .breakdown-grid {
      flex-direction: column;
      gap: 0.5rem;
    }

    .pricing-info {
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
    }
  }

  @media (max-width: 480px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .metric-card {
      flex-direction: row;
      align-items: center;
    }

    .metric-value {
      font-size: 1.125rem;
    }
  }
</style>