<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import { X } from 'lucide-svelte';

  export let isOpen = false;
  export let title = '';
  export let modalClass = '';

  const dispatch = createEventDispatcher();

  function closeModal() {
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={closeModal} transition:fly={{ y: -20, duration: 300 }}>
    <div class="modal-content {modalClass}" on:click|stopPropagation transition:fly={{ y: 20, duration: 300 }}>
      <div class="modal-header">
        <h2 class="modal-title">{title}</h2>
        <button class="close-button" on:click={closeModal}>
          <X size={24} />
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--surface-color);
    color: var(--text-color);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    width: var(--modal-width, 90%);
    max-width: var(--modal-max-width, 600px);
    height: var(--modal-height, auto);
    max-height: var(--modal-max-height, 90vh);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s ease;
  }

  .close-button:hover {
    color: var(--text-color);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
  }
</style>