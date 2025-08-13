<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-svelte';

  export let onPasswordSubmit: (password: string) => Promise<void>;
  export let error: string | null = null;
  export let isLoading = false;

  let password = '';
  let showPassword = false;

  const dispatch = createEventDispatcher();

  async function handleSubmit() {
    if (!password || isLoading) return;
    await onPasswordSubmit(password);
  }
</script>

<div class="modal-backdrop">
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <KeyRound size={32} />
      <h2 class="modal-title">Password Required</h2>
      <p class="modal-subtitle">This conversation is protected. Please enter the password to view.</p>
    </div>

    <form class="password-form" on:submit|preventDefault={handleSubmit}>
      <div class="password-input-wrapper">
        {#if showPassword}
          <input 
            type="text" 
            bind:value={password}
            placeholder="Enter password"
            required
          />
        {:else}
          <input 
            type="password" 
            bind:value={password}
            placeholder="Enter password"
            required
          />
        {/if}
        <button type="button" class="toggle-password-btn" on:click={() => showPassword = !showPassword}>
          {#if showPassword} <EyeOff size={18} /> {:else} <Eye size={18} /> {/if}
        </button>
      </div>

      {#if error}
        <p class="error-message">{error}</p>
      {/if}

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          <Loader2 size={20} class="spinner" />
        {:else}
          Unlock Conversation
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }
  .modal-content {
    background: var(--surface-color);
    color: var(--text-color);
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    border: 1px solid var(--border-color);
    text-align: center;
  }
  .modal-header {
    margin-bottom: 1.5rem;
  }
  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0.5rem 0;
  }
  .modal-subtitle {
    font-size: 0.95rem;
    color: var(--text-muted);
    margin: 0;
  }
  .password-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .password-input-wrapper {
    position: relative;
  }
  .password-input-wrapper input {
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--background-color);
    color: var(--text-color);
    font-size: 1rem;
    text-align: center;
  }
  .toggle-password-btn {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
  }
  .submit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem;
    border: none;
    border-radius: 8px;
    background: var(--primary-color);
    color: white;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .submit-btn:disabled {
    background: var(--text-muted);
    cursor: not-allowed;
  }
  .spinner {
    animation: spin 1.5s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .error-message {
    color: #e53e3e;
    font-size: 0.875rem;
    margin: -0.5rem 0 0;
  }
</style>
