<script lang="ts">
  import { mdiFileCode, mdiFileDocumentOutline } from '@mdi/js';
  export let filename: string;
  export let version: number | undefined = undefined;
  export let isActive: boolean = false; 
  let isHovered = false;
  
  // Reactive statement to ensure active cards stay in hovered state
  $: shouldShowHovered = isHovered || isActive;
</script>

<div 
  class="file-card" 
  class:active={isActive}
  class:hovered={shouldShowHovered}
  on:mouseenter={() => isHovered = true} 
  on:mouseleave={() => isHovered = false}
>
  <div class="content-wrapper">
    <span class="file-name" title={filename}>{filename}</span>
    <div class="tags-container">
      {#if version !== undefined}
        <div class="version-tag">Version {version}</div>
      {/if}
      <div class="artifact-tag">Artifact</div>
    </div>
  </div>

  <div class="icon-wrapper">
    <svg class="file-icon" viewBox="0 0 24 24">
      <path fill="currentColor" d={shouldShowHovered ? mdiFileDocumentOutline : mdiFileCode} />
    </svg>
  </div>
</div>

<style>
  .file-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 12px;
    background-color: transparent;
    margin: 0.75rem 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 72px;
    cursor: pointer;
    width: 100%;
  }

  .file-card:hover,
  .file-card.hovered:not(.active) {
    background-color: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .file-card.active {
    border-color: rgba(var(--primary-rgb), 0.3);
    background-color: rgba(var(--primary-rgb), 0.04);
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }

  .file-name {
    font-weight: 500;
    font-size: 1.05rem;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.4rem;
  }

  .tags-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .artifact-tag {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.04);
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    width: fit-content;
  }

  .file-card.active .artifact-tag {
    color: var(--primary-color);
    background: rgba(var(--primary-rgb), 0.1);
  }

  .version-tag {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.04);
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    width: fit-content;
  }

  .file-card.active .version-tag {
    color: #14b8a6;
    background: rgba(20, 184, 166, 0.1);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 1rem;
    flex-shrink: 0;
  }

  .file-icon {
    width: 44px;
    height: 44px;
    color: var(--text-muted);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.6;
  }

  .file-card:hover .file-icon,
  .file-card.hovered .file-icon {
    color: var(--primary-color);
    opacity: 0.8;
    transform: scale(1.05);
  }

  .file-card.active .file-icon {
    color: var(--primary-color);
    opacity: 1;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .file-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .file-card:hover,
    .file-card.hovered:not(.active) {
      background-color: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .file-card.active {
      border-color: rgba(var(--primary-rgb), 0.4);
      background-color: rgba(var(--primary-rgb), 0.06);
    }

    .artifact-tag {
      background: rgba(255, 255, 255, 0.06);
    }

    .version-tag {
      background: rgba(255, 255, 255, 0.06);
    }

    .file-card.active .version-tag {
      color: #5eead4;
      background: rgba(94, 234, 212, 0.12);
    }
  }
</style>