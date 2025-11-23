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
      <X size={20} strokeWidth={1.5} />
    </button>

    <div class="modal-header">
      <h2 class="modal-title">Share Conversation</h2>
      <p class="modal-subtitle">
        {#if !$shareStore.shareUrl}
          Generate a secure link to share your conversation.
        {:else}
          Your shareable link is ready.
        {/if}
      </p>
    </div>

    <div class="modal-body">
      {#if $shareStore.isLoading}
        <div class="loading-state">
          <Loader2 size={32} class="spinner" strokeWidth={1.5} />
          <p>Generating link...</p>
        </div>
      {:else if $shareStore.shareUrl}
        <div class="link-container">
          <input type="text" readonly value={$shareStore.shareUrl} class="link-input" />
          <button class="copy-btn" on:click={handleCopy} aria-label="Copy link">
            <Copy size={16} strokeWidth={1.5} />
            <span>{copySuccess ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      {:else}
        <div class="password-section">
          <div class="password-header">
            <KeyRound size={16} strokeWidth={1.5} />
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
                <EyeOff size={18} strokeWidth={1.5} />
              {:else}
                <Eye size={18} strokeWidth={1.5} />
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
  /* --- Local Design System: Warm Editorial --- */
  .modal-content {
    /* Light Mode Defaults */
    --sm-bg: #F9F8F6;
    --sm-text: #2C2C2C;
    --sm-text-muted: #787570;
    --sm-border: rgba(0, 0, 0, 0.06);
    --sm-hover: rgba(44, 44, 44, 0.04);
    --sm-active-bg: #EBE9E5;
    --sm-accent: #667eea;
    --sm-accent-text: #ffffff;
    --sm-font-serif: "Merriweather", "Georgia", serif;
    --sm-font-sans: "Inter", system-ui, sans-serif;
  }

  :global([data-theme="dark"]) .modal-content {
    /* Dark Mode Overrides */
    --sm-bg: #1C1B1A;
    --sm-text: #E6E4E0;
    --sm-text-muted: #9C9A96;
    --sm-border: rgba(255, 255, 255, 0.06);
    --sm-hover: rgba(255, 255, 255, 0.04);
    --sm-active-bg: #2A2928;
    --sm-accent-text: #ffffff;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4); /* Lighter, more elegant backdrop */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    animation: fadeIn 0.3s ease;
  }

  .modal-content {
    background: var(--sm-bg);
    color: var(--sm-text);
    border-radius: 12px; /* Slightly tighter radius */
    padding: 2.5rem;
    width: 100%;
    max-width: 440px;
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.05), 
      0 10px 15px -3px rgba(0, 0, 0, 0.05),
      0 0 0 1px var(--sm-border); /* Subtle border instead of heavy shadow */
    position: relative;
    font-family: var(--sm-font-sans);
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* --- Typography --- */
  .modal-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  .modal-title {
    font-family: var(--sm-font-serif);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--sm-text);
    margin: 0 0 0.5rem;
    letter-spacing: -0.02em;
  }
  .modal-subtitle {
    font-size: 0.925rem;
    color: var(--sm-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  /* --- Close Button --- */
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    color: var(--sm-text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: var(--sm-hover);
    color: var(--sm-text);
  }

  /* --- Inputs & Password --- */
  .password-section {
    margin-bottom: 1.5rem;
  }
  .password-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--sm-text-muted);
    margin-bottom: 0.75rem;
  }
  .password-input-wrapper {
    position: relative;
  }
  .password-input, .link-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--sm-border);
    background: var(--sm-active-bg);
    color: var(--sm-text);
    font-size: 0.95rem;
    transition: all 0.2s ease;
    font-family: var(--sm-font-sans);
  }
  .password-input:focus, .link-input:focus {
    outline: none;
    border-color: var(--sm-accent);
    background: var(--sm-bg);
    box-shadow: 0 0 0 3px var(--sm-accent-muted, rgba(102, 126, 234, 0.1));
  }
  .password-input {
    padding-right: 3rem;
  }

  .toggle-password-btn {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--sm-text-muted);
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  .toggle-password-btn:hover {
    color: var(--sm-text);
    background: var(--sm-hover);
  }

  /* --- Buttons --- */
  .create-link-btn {
    width: 100%;
    padding: 0.875rem;
    border: none;
    border-radius: 50px; /* Pill shape */
    background: var(--sm-text); /* Dark button in light mode */
    color: var(--sm-bg); /* Light text */
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  :global([data-theme="dark"]) .create-link-btn {
    background: var(--sm-text); /* Light button in dark mode */
    color: var(--sm-bg); /* Dark text */
  }
  .create-link-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    opacity: 0.95;
  }
  .create-link-btn:active {
    transform: translateY(0);
  }

  /* --- Link Result --- */
  .link-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: 1px solid var(--sm-border);
    border-radius: 50px; /* Pill shape */
    background: transparent;
    color: var(--sm-text);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .copy-btn:hover {
    background: var(--sm-hover);
    border-color: var(--sm-text-muted);
  }

  /* --- Loading & Error --- */
  .loading-state {
    text-align: center;
    padding: 2rem 0;
    color: var(--sm-text-muted);
  }
  .spinner {
    animation: spin 1.5s linear infinite;
    color: var(--sm-accent);
    margin-bottom: 1rem;
  }
  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    text-align: center;
    margin-top: 1rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.05);
    border-radius: 6px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
</style>
