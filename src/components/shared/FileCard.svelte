<script lang="ts">
  import { mdiFileCode, mdiFileDocumentOutline } from '@mdi/js';
  export let filename: string;
  let isHovered = false;
</script>

<div 
  class="file-card" 
  on:mouseenter={() => isHovered = true} 
  on:mouseleave={() => isHovered = false}
>
  <div class="content-wrapper">
    <span class="file-name" title={filename}>{filename}</span>
    <div class="artifact-tag">Artifact</div>
  </div>

  <div class="icon-wrapper">
    <svg class="file-icon" viewBox="0 0 24 24">
      <path fill="currentColor" d={isHovered ? mdiFileDocumentOutline : mdiFileCode} />
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
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 14px;
    background-color: var(--surface-color);
    margin: 0.75rem 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08);
    transition: all 0.25s ease-out;
    min-height: 72px;
    cursor: pointer;
  }

  .file-card:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.12);
    background-color: rgba(var(--primary-rgb), 0.02);
    transform: translateY(-1px);
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }

  .file-name {
    font-weight: 500;
    font-size: 1.2rem;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 0.4rem;
  }

  .artifact-tag {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--primary-color);
    background: rgba(var(--primary-rgb), 0.08);
    padding: 2px 8px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    width: fit-content;
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 1rem;
    flex-shrink: 0;
  }

  .file-icon {
    width: 54px;
    height: 54px;
    color: var(--primary-color);
    transition: transform 0.25s ease, filter 0.25s ease;
  }

  .file-card:hover .file-icon {
    transform: scale(1.1) rotate(10deg);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12));
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .file-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.25);
    }
    .file-card:hover {
      background-color: rgba(var(--primary-rgb), 0.05);
    }
  }
</style>