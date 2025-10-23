<script lang="ts">
  import { Globe, ChevronDown, ExternalLink } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  
  export let query: string = '';
  export let urls: Array<{ title: string; url: string }> = [];
  export let isLoading: boolean = false;
  
  let isExpanded = false;
  let currentDomainIndex = 0;
  let animationInterval: any = null;
  
  $: domains = urls.map(u => getDomain(u.url));
  $: hasResults = urls.length > 0;
  $: canExpand = hasResults && !isLoading;
  
  function getDomain(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
  
  function toggleExpand() {
    if (canExpand) {
      isExpanded = !isExpanded;
    }
  }
  
  // Start domain animation when loading
  $: if (isLoading && domains.length > 0) {
    startAnimation();
  } else {
    stopAnimation();
  }
  
  function startAnimation() {
    if (animationInterval) return;
    
    animationInterval = setInterval(() => {
      currentDomainIndex = (currentDomainIndex + 1) % domains.length;
    }, 2000); // Change domain every 2 seconds
  }
  
  function stopAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  }
  
  onDestroy(() => {
    stopAnimation();
  });
</script>

<div class="web-search-container">
  <button 
    class="search-header" 
    on:click={toggleExpand}
    class:clickable={canExpand}
  >
    <div class="search-icon">
      <Globe size={18} />
    </div>
    <div class="search-info">
      {#if isLoading && domains.length > 0}
        <span class="search-label animated">
          Searched <span class="domain-animation">{domains[currentDomainIndex]}</span>
        </span>
      {:else if isLoading}
        <span class="search-label">Searching the web...</span>
      {:else if hasResults}
        <span class="search-label">
          Searched {urls.length} {urls.length === 1 ? 'site' : 'sites'}
        </span>
      {:else}
        <span class="search-label">No results found</span>
      {/if}
    </div>
    {#if canExpand}
      <div class="expand-icon" class:rotated={isExpanded}>
        <ChevronDown size={16} />
      </div>
    {/if}
  </button>
  
  {#if isExpanded && hasResults}
    <div class="search-results" transition:slide={{ duration: 250 }}>
      {#each urls as result, index}
        <a 
          href={result.url} 
          target="_blank" 
          rel="noopener noreferrer"
          class="result-item"
        >
          <div class="result-number">{index + 1}</div>
          <div class="result-content">
            <span class="result-title">{result.title}</span>
            <span class="result-domain">{getDomain(result.url)}</span>
          </div>
          <ExternalLink size={14} class="external-icon" />
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .web-search-container {
    margin: 0.75rem 0;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-color);
    width: 100%;
  }
  
  .search-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    background: transparent;
    border: none;
    cursor: default;
    transition: background-color 0.2s ease;
    text-align: left;
  }
  
  .search-header.clickable {
    cursor: pointer;
  }
  
  .search-header.clickable:hover {
    background: var(--hover-color);
  }
  
  .search-icon {
    color: var(--primary-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  
  .search-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  
  .search-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    line-height: 1.4;
  }
  
  .search-label.animated {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  
  .domain-animation {
    color: var(--primary-color);
    font-weight: 600;
    animation: fadeSlide 0.4s ease-in-out;
    display: inline-block;
  }
  
  @keyframes fadeSlide {
    0% {
      opacity: 0;
      transform: translateY(-4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .expand-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
  }
  
  .expand-icon.rotated {
    transform: rotate(180deg);
  }
  
  .search-results {
    border-top: 1px solid var(--border-color);
    background: var(--background-color);
  }
  
  .result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s ease;
    border-bottom: 1px solid var(--border-color);
  }
  
  .result-item:last-child {
    border-bottom: none;
  }
  
  .result-item:hover {
    background: var(--hover-color);
  }
  
  .result-number {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    min-width: 20px;
    text-align: center;
  }
  
  .result-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  
  .result-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }
  
  .result-domain {
    font-size: 0.75rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .result-item :global(.external-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }
</style>