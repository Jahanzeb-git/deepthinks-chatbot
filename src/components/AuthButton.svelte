<script lang="ts">
  import { authStore } from '../stores/auth';
  import { LogIn, UserPlus } from 'lucide-svelte';
  import ProfileMenu from './ProfileMenu.svelte';
  
  export let onAuthClick: () => void;
  
  $: user = $authStore.user;
  $: isAuthenticated = $authStore.isAuthenticated;
  $: isSignedUp = $authStore.isSignedUp;
  
  // Determine what to show based on auth state
  $: buttonText = !isSignedUp ? 'Signup' : 'Login';
  $: ButtonIcon = !isSignedUp ? UserPlus : LogIn;
  
  function handleProfileLogout() {
    authStore.logout();
  }
</script>

<div class="auth-container">
  {#if isAuthenticated && user}
    <!-- Show Profile Icon when logged in -->
    <ProfileMenu {user} on:logout={handleProfileLogout} />
  {:else}
    <!-- Show Signup/Login button when not authenticated -->
    <button class="auth-button" on:click={onAuthClick}>
      <div class="auth-icon">
        <svelte:component this={ButtonIcon} size={16} color="white" />
      </div>
      <span class="auth-text">{buttonText}</span>
    </button>
  {/if}
</div>

<style>
  .auth-container {
    position: fixed;
    top: 2rem;
    right: 2rem;
    z-index: 110;
  }
  
  .auth-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-color);
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    box-shadow: 
      0 2px 12px rgba(0, 0, 0, 0.08),
      0 0 0 1px rgba(0, 0, 0, 0.05);
  }
  
  .auth-button:hover {
    background: var(--hover-color);
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.12),
      0 0 0 1px var(--primary-color);
  }
  
  .auth-button:active {
    transform: translateY(0);
  }
  
  .auth-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-color);
    color: white;
    border-radius: 6px;
    transition: all 0.3s ease;
  }
  
  .auth-icon :global(svg) {
    display: block;
    color: white;
  }
  
  .auth-button:hover .auth-icon {
    background: var(--primary-hover);
    transform: scale(1.05);
  }
  
  .auth-text {
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  @media (max-width: 768px) {
    .auth-container {
      top: 1.5rem;
      right: 1.5rem;
    }
    
    .auth-button {
      padding: 0.6rem 1rem;
      font-size: 0.8rem;
      gap: 0.4rem;
    }
    
    .auth-icon {
      width: 20px;
      height: 20px;
    }
  }
</style>