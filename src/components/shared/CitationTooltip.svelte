<script lang="ts">
  import { ExternalLink } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  
  export let sources: Array<{ index: number; url: string; title: string }> = [];
  
  function getFaviconUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  }
  
  function handleSourceClick(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
</script>

<div 
  class="citation-tooltip"
  transition:fly="{{ y: -8, duration: 200 }}"
>
  <div class="tooltip-arrow"></div>
  <div class="tooltip-content">
    <div class="tooltip-header">
      <span class="source-count">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="sources-list">
      {#each sources as source (source.index)}
        <button 
          class="source-item"
          on:click={() => handleSourceClick(source.url)}
          transition:fade="{{ duration: 150 }}"
        >
          <div class="source-favicon">
            <img 
              src={getFaviconUrl(source.url)} 
              alt=""
              on:error={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
          <div class="source-info">
            <div class="source-title">{source.title}</div>
            <div class="source-url">{new URL(source.url).hostname}</div>
          </div>
          <div class="source-icon">
            <ExternalLink size={14} />
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .citation-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: auto;
  }
  
  .tooltip-arrow {
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: var(--surface-color);
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
  }
  
  .tooltip-content {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 280px;
    max-width: 400px;
    overflow: hidden;
    backdrop-filter: blur(10px);
  }
  
  .tooltip-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--hover-color);
  }
  
  .source-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .sources-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .source-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }
  
  .source-item:last-child {
    border-bottom: none;
  }
  
  .source-item:hover {
    background: var(--hover-color);
  }
  
  .source-favicon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    overflow: hidden;
    background: var(--background-color);
  }
  
  .source-favicon img {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }
  
  .source-info {
    flex: 1;
    min-width: 0;
  }
  
  .source-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.125rem;
  }
  
  .source-url {
    font-size: 0.75rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .source-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .source-item:hover .source-icon {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    .tooltip-content {
      min-width: 240px;
      max-width: calc(100vw - 2rem);
    }
    
    .sources-list {
      max-height: 200px;
    }
  }
</style>