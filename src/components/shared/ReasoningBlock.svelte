<script lang="ts">
  import { renderMarkdown } from '../../lib/markdown';
  import { ChevronDown, Loader } from 'lucide-svelte';
  import { afterUpdate } from 'svelte';

  export let content: string;
  export let streaming: boolean = false;

  let expanded = false;
  let contentWrapper: HTMLDivElement;

  function toggleExpand() {
    expanded = !expanded;
  }

  afterUpdate(() => {
    if (contentWrapper && !expanded) {
      contentWrapper.scrollTop = contentWrapper.scrollHeight;
    }
  });

  $: iconClass = `rotating-icon ${streaming ? 'streaming' : ''}`;
</script>

<div class="thinking-container" class:expanded>
  <div class="thinking-header">
    <div class="thinking-title">
      <Loader size={16} class={iconClass} />
      <span>Reasoning...</span>
    </div>
    <button class="expand-btn" on:click={toggleExpand}>
      <ChevronDown size={18} />
    </button>
  </div>
  <div class="thinking-content-wrapper" bind:this={contentWrapper}>
    <div class="thinking-content">{@html renderMarkdown(content)}</div>
    <div class="fade-overlay top"></div>
    <div class="fade-overlay bottom"></div>
  </div>
</div>

<style>
  .thinking-container {
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin: 1rem 0;
    background: var(--surface-color);
    overflow: hidden;
    transition: all 0.3s ease;
    animation: thinking-border-pulse 2s infinite;
  }

  @keyframes thinking-border-pulse {
    0% { border-color: var(--border-color); }
    50% { border-color: var(--primary-color); }
    100% { border-color: var(--border-color); }
  }

  .thinking-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--hover-color);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .thinking-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rotating-icon {
    color: red;
  }

  .rotating-icon.streaming {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: transform 0.3s ease;
  }

  .thinking-container.expanded .expand-btn {
    transform: rotate(180deg);
  }

  .thinking-content-wrapper {
    position: relative;
    max-height: 100px;
    overflow-y: auto;
    transition: max-height 0.3s ease;
  }

  .thinking-container.expanded .thinking-content-wrapper {
    max-height: 500px;
  }

  .thinking-content {
    padding: 1rem;
  }

  .fade-overlay {
    position: absolute;
    left: 0;
    right: 0;
    height: 30px;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .fade-overlay.top {
    top: 0;
    background: linear-gradient(to bottom, var(--surface-color), transparent);
  }

  .fade-overlay.bottom {
    bottom: 0;
    background: linear-gradient(to top, var(--surface-color), transparent);
  }

  .thinking-container.expanded .fade-overlay {
    opacity: 0;
  }
</style>