
<script lang="ts">
  import Modal from './Modal.svelte';
  import Toggle from '../shared/Toggle.svelte';
  import { settingsStore } from '../../stores/settings';

  export let isOpen = false;

  let improveModel = $settingsStore.dataControl?.improveModel ?? true;

  function handleToggle(event: CustomEvent<boolean>) {
    improveModel = event.detail;
    settingsStore.updateSettings({ 
      dataControl: { 
        ...$settingsStore.dataControl,
        improveModel 
      } 
    });
  }

  function handleClose() {
    isOpen = false;
  }
</script>

<Modal {isOpen} on:close={handleClose} title="Data Control" modalClass="data-control-modal">
  <div class="content">
    <p class="description">
      Help improve our AI by allowing us to use your anonymized conversation data. 
      We are committed to privacy and will never use data that can be linked back to you. 
      This helps us train more accurate and helpful models for everyone.
    </p>
    
    <div class="toggle-wrapper">
      <Toggle checked={improveModel} on:change={handleToggle} />
      <span class="toggle-label">
        Improve model for everyone
      </span>
    </div>
  </div>
</Modal>

<style>
  :global(.data-control-modal .modal-content) {
    max-width: 500px;
  }
  .content {
    padding: 1rem 0;
  }
  .description {
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--text-secondary-color);
    margin-bottom: 2rem;
  }
  .toggle-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary-color);
    padding: 1rem;
    border-radius: 12px;
  }
  .toggle-label {
    margin-left: 1rem;
    font-weight: 500;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
  .btn-primary, .btn-secondary {
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
  }
  .btn-primary {
    background: var(--primary-color);
    color: white;
  }
  .btn-secondary {
    background: var(--hover-color);
    color: var(--text-color);
  }
</style>
