<script lang="ts">
  import { renderMarkdown } from '../../lib/markdown';
  import { ChevronDown, Brain } from 'lucide-svelte';
  import { afterUpdate, onMount } from 'svelte';

  export let content: string;
  export let streaming: boolean = false;

  let expanded = false;
  let contentWrapper: HTMLDivElement;
  let isAutoScrolling = true;
  let lastContentLength = 0;

  function toggleExpand() {
    expanded = !expanded;
    if (expanded) {
      isAutoScrolling = false;
    }
  }

  function handleScroll() {
    if (!contentWrapper) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentWrapper;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    
    if (expanded) {
      isAutoScrolling = isAtBottom;
    }
  }

  afterUpdate(() => {
    if (contentWrapper && streaming && content.length > lastContentLength) {
      if (!expanded || isAutoScrolling) {
        // Smooth scroll to bottom with animation
        contentWrapper.scrollTo({
          top: contentWrapper.scrollHeight,
          behavior: 'smooth'
        });
      }
      lastContentLength = content.length;
    }
  });

  onMount(() => {
    if (contentWrapper) {
      contentWrapper.addEventListener('scroll', handleScroll);
      return () => contentWrapper.removeEventListener('scroll', handleScroll);
    }
  });

  $: iconClasses = streaming ? 'icon-active' : 'icon-idle';
  $: containerClasses = `thinking-container ${expanded ? 'expanded' : ''} ${streaming ? 'streaming' : ''}`;
</script>

<div class={containerClasses}>
  <div class="thinking-header">
    <div class="thinking-title">
      <div class="icon-wrapper">
        <Brain size={16} class={iconClasses} />
        <div class="icon-glow"></div>
      </div>
      <span class="title-text">
        {streaming ? 'Reasoning...' : 'Reasoning Complete'}
      </span>
    </div>
    <button class="expand-btn" on:click={toggleExpand} aria-label={expanded ? 'Collapse' : 'Expand'}>
      <ChevronDown size={18} />
    </button>
  </div>
  
  <div class="thinking-content-wrapper" bind:this={contentWrapper}>
    <div class="thinking-content">
      {@html renderMarkdown(content)}
      {#if streaming}
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      {/if}
    </div>
    
    {#if !expanded}
      <div class="fade-overlay top"></div>
      <div class="fade-overlay bottom"></div>
    {/if}
  </div>
  
  <div class="progress-bar" style="transform: scaleX({streaming ? '0.7' : '1'})"></div>
</div>

<style>
  .thinking-container {
    border: 1px solid var(--reasoning-border);
    border-radius: 16px;
    margin: 1.5rem 0;
    background: var(--reasoning-bg);
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    backdrop-filter: blur(8px);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .thinking-container.streaming {
    border-color: rgba(239, 68, 68, 0.3);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(239, 68, 68, 0.1),
      0 0 20px rgba(239, 68, 68, 0.1);
    animation: subtle-pulse 3s ease-in-out infinite;
  }

  @keyframes subtle-pulse {
    0%, 100% { 
      border-color: rgba(239, 68, 68, 0.3);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(239, 68, 68, 0.1),
        0 0 20px rgba(239, 68, 68, 0.1);
    }
    50% { 
      border-color: rgba(239, 68, 68, 0.5);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(239, 68, 68, 0.2),
        0 0 25px rgba(239, 68, 68, 0.15);
    }
  }

  .thinking-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 100%);
    font-weight: 600;
    font-size: 0.875rem;
    color: hsl(var(--foreground));
    border-bottom: 1px solid hsl(var(--border));
  }

  .thinking-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-glow {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  :global(.icon-active) {
    color: var(--primary-color) !important;
    animation: rotate-blink 2s linear infinite;
    filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.5));
  }

  :global(.icon-active) + .icon-glow {
    opacity: 1;
    animation: glow-pulse 2s ease-in-out infinite;
  }

  :global(.icon-idle) {
    color: #10b981 !important;
    transition: color 0.3s ease;
  }

  @keyframes rotate-blink {
    0% { 
      transform: rotate(0deg); 
      opacity: 1; 
    }
    25% { 
      transform: rotate(90deg); 
      opacity: 0.3; 
    }
    50% { 
      transform: rotate(180deg); 
      opacity: 1; 
    }
    75% { 
      transform: rotate(270deg); 
      opacity: 0.3; 
    }
    100% { 
      transform: rotate(360deg); 
      opacity: 1; 
    }
  }

  @keyframes glow-pulse {
    0%, 100% { 
      transform: scale(1); 
      opacity: 0.3; 
    }
    50% { 
      transform: scale(1.2); 
      opacity: 0.6; 
    }
  }

  .title-text {
    transition: color 0.3s ease;
  }

  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .expand-btn:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--muted));
    transform: scale(1.05);
  }

  .thinking-container.expanded .expand-btn {
    transform: rotate(180deg);
  }

  .thinking-container.expanded .expand-btn:hover {
    transform: rotate(180deg) scale(1.05);
  }

  .thinking-content-wrapper {
    position: relative;
    max-height: 120px;
    overflow-y: auto;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    scroll-behavior: smooth;
  }

  /* Custom scrollbar styling */
  .thinking-content-wrapper::-webkit-scrollbar {
    width: 6px;
  }

  .thinking-content-wrapper::-webkit-scrollbar-track {
    background: hsl(var(--muted)/0.3);
    border-radius: 3px;
  }

  .thinking-content-wrapper::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground)/0.5);
    border-radius: 3px;
    transition: background 0.2s ease;
  }

  .thinking-content-wrapper::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground)/0.8);
  }

  /* Firefox scrollbar */
  .thinking-content-wrapper {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground)/0.5) hsl(var(--muted)/0.3);
  }

  .thinking-container.expanded .thinking-content-wrapper {
    max-height: 60vh;
  }

  .thinking-content {
    padding: 1.25rem;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }

  .thinking-content :global(p) {
    margin-bottom: 0.75rem;
  }

  .thinking-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .thinking-content :global(code) {
    background: hsl(var(--muted));
    padding: 0.125rem 0.25rem;
    border-radius: 4px;
    font-size: 0.875em;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    margin-top: 0.5rem;
    align-items: center;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    animation: typing-dot 1.4s ease-in-out infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing-dot {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }

  .fade-overlay {
    position: absolute;
    left: 0;
    right: 0;
    height: 24px;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 1;
  }

  .fade-overlay.top {
    top: 0;
    background: linear-gradient(to bottom, 
      hsl(var(--card)) 0%, 
      hsl(var(--card)/0.8) 50%,
      transparent 100%
    );
  }

  .fade-overlay.bottom {
    bottom: 0;
    background: linear-gradient(to top, 
      hsl(var(--card)) 0%, 
      hsl(var(--card)/0.8) 50%,
      transparent 100%
    );
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      #ef4444 50%, 
      transparent 100%
    );
    transform-origin: left;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Dark mode improvements */
  @media (prefers-color-scheme: dark) {
    .thinking-container {
      background: hsl(var(--card));
      border-color: hsl(var(--border));
    }
    
    .thinking-header {
      background: linear-gradient(135deg, 
        hsl(var(--muted)) 0%, 
        hsl(var(--muted)/0.3) 100%
      );
    }
  }

  /* Reduced motion accessibility */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>