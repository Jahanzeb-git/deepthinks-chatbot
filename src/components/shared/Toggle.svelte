
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let checked: boolean = false;
  export let label: string = '';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  // This reactive statement will dispatch the 'change' event
  // whenever the 'checked' prop changes, after the component updates.
  $: dispatch('change', checked);
</script>

<label class="toggle-switch" class:disabled>
  <!-- The on:change handler is removed to prevent race conditions with bind:checked -->
  <input type="checkbox" bind:checked {disabled} />
  <span class="slider"></span>
  {#if label}
    <span class="label-text">{label}</span>
  {/if}
</label>

<style>
  .toggle-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .toggle-switch.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .label-text {
    margin-left: 12px;
    font-size: 1rem;
    user-select: none;
  }

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: relative;
    display: block;
    width: 44px;
    height: 26px;
    background-color: var(--border-color);
    border-radius: 34px;
    transition: background-color 0.2s ease-in-out;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s ease-in-out;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  input:checked + .slider {
    background-color: #34C759; /* iOS Green */
  }

  input:focus-visible + .slider {
     box-shadow: 0 0 0 2px var(--bg-color), 0 0 0 4px var(--primary-color);
  }

  input:checked + .slider:before {
    transform: translateX(18px);
  }
</style>
