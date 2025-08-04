<script lang="ts">
  export let text: string;
  export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  export let enabled: boolean = true;
</script>

<div class="tooltip-wrapper">
  <slot />
  {#if enabled}
    <div class="tooltip-box {position}">
      {text}
      <div class="tooltip-arrow {position}" />
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip-box {
    position: absolute;
    background-color: var(--surface-color, #f0f0f0);
    color: var(--text-color, #333);
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    z-index: 20;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color, #e0e0e0);
  }

  .tooltip-wrapper:hover .tooltip-box {
    opacity: 1;
    visibility: visible;
    transform: scale(1);
  }

  .tooltip-arrow {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: inherit;
    border: 1px solid var(--border-color, #e0e0e0);
    border-bottom-right-radius: 2px;
  }

  .tooltip-box.top {
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip-arrow.top {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-top: none;
    border-left: none;
  }

  .tooltip-box.bottom {
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
  }

  .tooltip-arrow.bottom {
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(225deg);
    border-top: none;
    border-left: none;
  }

  .tooltip-box.left {
    right: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  .tooltip-arrow.left {
    right: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(135deg);
    border-top: none;
    border-left: none;
  }

  .tooltip-box.right {
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
  }

  .tooltip-arrow.right {
    left: -5px;
    top: 50%;
    transform: translateY(-50%) rotate(-45deg);
    border-top: none;
    border-left: none;
  }
</style>
