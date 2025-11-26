<script lang="ts">
  import { FileText, Loader2 } from 'lucide-svelte';
  
  export let filename: string;
  export let version: number | undefined = undefined;
  export let isActive: boolean = false;
  export let isLoading: boolean = false;
</script>

<div class="file-card" class:active={isActive}>
  <div class="icon">
    <FileText size={16} strokeWidth={1.5} />
  </div>
  <div class="info">
    <span class="filename" title={filename}>{filename}</span>
    {#if version !== undefined}
      <span class="version">v{version}</span>
    {/if}
  </div>
  {#if isLoading}
    <div class="spinner">
      <Loader2 size={14} class="spin" />
    </div>
  {/if}
</div>

<style>
  .file-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: #EBE9E5;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    min-height: 72px;
    user-select: none;
    position: relative;
  }

  .file-card:hover {
    border-color: #a19e98ff;
  }

  .icon {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px; /* Bigger icon area */
    height: 40px;
  }

  .file-card.active .icon {
    color: var(--primary-color);
  }

  .info {
    display: flex;
    flex-direction: column; /* Stack name and version */
    gap: 0.25rem;
    overflow: hidden;
    flex: 1;
  }

  .filename {
    font-size: 1rem; /* Restore font size */
    font-weight: 500;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: monospace;
    background: rgba(0,0,0,0.05);
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
  }

  .spinner {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    margin-left: 0.5rem;
    flex-shrink: 0;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Dark mode adjustments */
  :global([data-theme="dark"]) .file-card {
    background: var(--surface-color); /* Keep existing dark theme bg */
    border-color: rgba(255, 255, 255, 0.08);
  }
  
  :global([data-theme="dark"]) .version {
    background: rgba(255,255,255,0.05);
  }
</style>