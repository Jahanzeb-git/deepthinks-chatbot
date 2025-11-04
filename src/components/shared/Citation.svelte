<script lang="ts">
  import CitationTooltip from './CitationTooltip.svelte';
  
  export let indices: number[] = []; // e.g., [1, 2, 3]
  export let sources: Array<{ index: number; url: string; title: string }> = [];
  
  let showTooltip = false;
  let tooltipTimeout: NodeJS.Timeout;
  
  $: citationText = indices.length === 1 ? indices[0].toString() : `${indices[0]}-${indices[indices.length - 1]}`;
  $: matchingSources = sources.filter(s => indices.includes(s.index));
  
  function handleMouseEnter() {
    tooltipTimeout = setTimeout(() => {
      showTooltip = true;
    }, 300);
  }
  
  function handleMouseLeave() {
    clearTimeout(tooltipTimeout);
    showTooltip = false;
  }
</script>

<span class="citation-wrapper">
  <sup 
    class="citation-badge"
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    on:focus={handleMouseEnter}
    on:blur={handleMouseLeave}
    role="button"
    tabindex="0"
  >
    [{citationText}]
  </sup>
  
  {#if showTooltip && matchingSources.length > 0}
    <CitationTooltip sources={matchingSources} />
  {/if}
</span>

<style>
  .citation-wrapper {
    position: relative;
    display: inline;
  }
  
  .citation-badge {
    display: inline-flex;
    align-items: center;
    padding: 0 0.25rem;
    margin: 0 0.125rem;
    font-size: 0.75em;
    font-weight: 600;
    color: var(--primary-color);
    background: rgba(102, 126, 234, 0.08);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    vertical-align: super;
    line-height: 1;
  }
  
  .citation-badge:hover {
    background: rgba(102, 126, 234, 0.15);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .citation-badge {
      font-size: 0.7em;
      padding: 0 0.2rem;
    }
  }
</style>