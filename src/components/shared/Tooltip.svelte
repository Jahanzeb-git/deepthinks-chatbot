<script lang="ts">
  export let text: string;
  export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
</script>

<div class="tooltip-wrapper">
  <slot />
  <div class="tooltip-box {position}">
    {text}
  </div>
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip-box {
    position: absolute;
    background-color: var(--tooltip-background, #333);
    color: var(--tooltip-color, #fff);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
  }

  .tooltip-wrapper:hover .tooltip-box {
    opacity: 1;
    visibility: visible;
  }

  .tooltip-box.top {
    transform: translate(-50%, -100%);
    top: -8px;
    left: 50%;
  }

  .tooltip-box.bottom {
    transform: translate(-50%, 100%);
    bottom: -8px;
    left: 50%;
  }

  .tooltip-box.left {
    transform: translate(-100%, -50%);
    top: 50%;
    left: -8px;
  }

  .tooltip-box.right {
    transform: translate(100%, -50%);
    top: 50%;
    right: -8px;
  }
</style>