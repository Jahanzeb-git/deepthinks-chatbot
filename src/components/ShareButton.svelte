<script lang="ts">
  import { Share2 } from 'lucide-svelte';
  import { shareStore } from '../stores/share';
  import { isSidebarExpanded } from '../stores/sidebar';

  export let expanded: boolean = false;

  function handleOpenShareModal() {
    shareStore.openModal();
  }
</script>

<button 
  class="action-btn"
  class:expanded
  title="Share Conversation"
  on:click={handleOpenShareModal}
>
  <div class="btn-icon">
    <Share2 size={expanded ? 18 : 20} />
  </div>
  {#if expanded}
    <span class="btn-text">Share</span>
  {/if}
</button>

<style>
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    font-weight: 500;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    margin: 0 auto;
    border-radius: 10px;
    width: 40px;
    height: 40px;
    text-decoration: none;
    background: transparent;
    color: var(--text-muted);
  }
  .action-btn.expanded {
    width: calc(100% - 2rem);
    justify-content: flex-start;
    gap: 0.875rem;
    padding: 0;
    min-height: 44px;
  }
  
  .action-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: var(--hover-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .action-btn:hover::before {
    opacity: 1;
  }
  .action-btn:hover {
    color: var(--text-color);
  }

  .btn-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .btn-text {
    padding-right: 1.25rem;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.1s;
    font-size: 0.9rem;
    position: relative;
    z-index: 1;
  }

  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }
</style>
