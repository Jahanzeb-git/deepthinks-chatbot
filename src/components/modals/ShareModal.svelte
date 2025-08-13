<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Copy, KeyRound, Loader2, Eye, EyeOff } from 'lucide-svelte';
  import { shareStore } from '../../stores/share';
  import { sessionStore } from '../../stores/session';
  import { api } from '../../lib/api';

  let password = '';
  let showPassword = false;
  let copySuccess = false;

  const dispatch = createEventDispatcher();
  const DOMAIN = 'https://deepthinks.netlify.app';

  function closeModal() {
    shareStore.closeModal();
  }

  async function handleCreateLink() {
    if ($shareStore.isLoading) return;
    
    shareStore.setLoading(true);
    const sessionNumber = $sessionStore.currentSession;

    if (sessionNumber) {
      try {
        const { share_id } = await api.shareSession(sessionNumber, password || undefined);
        const fullUrl = `${DOMAIN}/share/${share_id}`;
        shareStore.setSharedLink(share_id, fullUrl);
      } catch (error: any) {
        shareStore.setError(error.message || 'Failed to create share link.');
      }
    } else {
      shareStore.setError('No active session to share.');
    }
  }

  function handleCopy() {
    if (!$shareStore.shareUrl) return;
    navigator.clipboard.writeText($shareStore.shareUrl).then(() => {
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
        closeModal();
      }, 1500);
    });
  }
</script>

<div class="modal-backdrop" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation>
    <button class="close-btn" on:click={closeModal} aria-label="Close modal">
      <X size={20} />
    </button>

    <div class="modal-header">
      <h2 class="modal-title">Share Conversation</h2>
      <p class="modal-subtitle">
        {#if !$shareStore.shareUrl}
          Generate a secure link to share your conversation with others.
        {:else}
          Your shareable link is ready.
        {/if}
      </p>
    </div>

    <div class="modal-body">
      {#if $shareStore.isLoading}
        <div class="loading-state">
          <Loader2 size={32} class="spinner" />
          <p>Generating link...</p>
        </div>
      {:else if $shareStore.shareUrl}
        <div class="link-container">
          <input type="text" readonly value={$shareStore.shareUrl} class="link-input" />
          <button class="copy-btn" on:click={handleCopy} aria-label="Copy link">
            <Copy size={18} />
            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      {:else}
        <div class="password-section">
          <div class="password-header">
            <KeyRound size={16} />
            <span>Protect with a password (optional)</span>
          </div>
          <div class="password-input-wrapper">
            {#if showPassword}
              <input 
                type="text" 
                bind:value={password}
                placeholder="Enter a password"
                class="password-input"
              />
            {:else}
              <input 
                type="password" 
                bind:value={password}
                placeholder="Enter a password"
                class="password-input"
              />
            {/if}
            <button class="toggle-password-btn" on:click={() => showPassword = !showPassword}>
              {#if showPassword}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>
          </div>
        </div>
        <button class="create-link-btn" on:click={handleCreateLink}>
          Create Link
        </button>
      {/if}

      {#if $shareStore.error}
        <p class="error-message">{$shareStore.error}</p>
      {/if}
    </div>
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
    max-width: 480px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    border: 1px solid var(--border-color);
    position: relative;
  }
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  .close-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }
  .modal-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  .modal-subtitle {
    font-size: 0.95rem;
    color: var(--text-muted);
    margin: 0;
  }
  .password-section {
    margin-bottom: 1.5rem;
  }
  .password-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.75rem;
  }
  .password-input-wrapper {
    position: relative;
  }
  .password-input {
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--background-color);
    color: var(--text-color);
    font-size: 1rem;
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
  .create-link-btn {
    width: 100%;
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
  .create-link-btn:hover {
    background: var(--primary-hover);
  }
  .loading-state {
    text-align: center;
    padding: 2rem 0;
  }
  .spinner {
    animation: spin 1.5s linear infinite;
    color: var(--primary-color);
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .link-container {
    display: flex;
    gap: 0.5rem;
  }
  .link-input {
    flex-grow: 1;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--background-color);
    color: var(--text-muted);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--surface-color);
    color: var(--text-color);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .copy-btn:hover {
    background: var(--hover-color);
  }
  .error-message {
    color: #e53e3e;
    font-size: 0.875rem;
    text-align: center;
    margin-top: 1rem;
  }
</style>
