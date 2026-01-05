<script lang="ts">
  import { creditsStore } from '../../stores/credits';
  import Modal from './Modal.svelte';
  import { Loader, AlertTriangle, CreditCard, Zap, PieChart } from 'lucide-svelte';

  $: ({ isCreditsModalOpen, isLoading, error, data } = $creditsStore);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatNumber(num: number) {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<Modal
  isOpen={isCreditsModalOpen}
  on:close={() => creditsStore.closeCreditsModal()}
  title="Credits & Usage"
  modalClass="credits-modal"
>
  <div class="credits-container">
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading credits...</span>
      </div>
    {:else if error}
      <div class="error-state">
        <AlertTriangle size={24} />
        <span>{error}</span>
        <button class="retry-btn" on:click={() => creditsStore.refresh()}>Retry</button>
      </div>
    {:else if data}
      <div class="stats-grid">
        <!-- Credits Card -->
        <div class="stat-card primary">
          <div class="card-header">
            <div class="icon-wrapper">
              <CreditCard size={20} />
            </div>
            <h3>Credits Balance</h3>
          </div>
          <div class="card-body">
            <div class="big-number">{formatCurrency(data.credits.remaining_credits_usd)}</div>
            <div class="sub-text">
              of {formatCurrency(data.credits.total_credits_usd)} total credits
            </div>
          </div>
        </div>

        <!-- Token Usage Card -->
        <div class="stat-card">
          <div class="card-header">
            <div class="icon-wrapper purple">
              <Zap size={20} />
            </div>
            <h3>Token Usage</h3>
          </div>
          <div class="card-body">
            <div class="progress-section">
              <div class="progress-header">
                <span class="progress-label">Used Tokens</span>
                <span class="progress-val">{data.tokens.tokens_percentage_used}%</span>
              </div>
              <div class="progress-track">
                <div 
                  class="progress-fill" 
                  style="width: {Math.min(data.tokens.tokens_percentage_used, 100)}%"
                ></div>
              </div>
              <div class="progress-meta">
                <span>{formatNumber(data.tokens.used_tokens)} used</span>
                <span>{formatNumber(data.tokens.total_allotted_tokens)} total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown Section -->
      <div class="breakdown-section">
        <div class="breakdown-header">
          <PieChart size={16} />
          <h4>Usage Breakdown</h4>
        </div>
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <span class="label">Input Tokens</span>
            <span class="value">{formatNumber(data.breakdown.input_tokens_used)}</span>
          </div>
          <div class="breakdown-item">
            <span class="label">Output Tokens</span>
            <span class="value">{formatNumber(data.breakdown.output_tokens_used)}</span>
          </div>
          <div class="breakdown-item">
            <span class="label">Total Interactions</span>
            <span class="value">{formatNumber(data.breakdown.total_interactions)}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style>
  .credits-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem;
  }

  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 0;
    color: var(--text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .retry-btn {
    padding: 0.5rem 1rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .retry-btn:hover {
    background: var(--hover-color);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .stat-card {
    background: var(--background-color); /* Slightly different from modal surface */
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-card.primary {
    background: linear-gradient(to bottom right, var(--background-color), var(--surface-color));
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-wrapper {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--hover-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
  }

  .icon-wrapper.purple {
    color: #8b5cf6;
    background: #f3e8ff;
  }

  .card-header h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-color);
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .big-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.2;
  }

  .sub-text {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* Progress Bar Styles */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .progress-val {
    color: var(--primary-color);
  }

  .progress-track {
    width: 100%;
    height: 8px;
    background: var(--hover-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: 4px;
    transition: width 0.5s ease-out;
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  /* Breakdown Section */
  .breakdown-section {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }

  .breakdown-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--text-muted);
  }

  .breakdown-header h4 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .breakdown-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .breakdown-item .label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .breakdown-item .value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
  }
</style>
