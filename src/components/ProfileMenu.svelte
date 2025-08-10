<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import { authStore, type User } from '../stores/auth';
  import { settingsStore } from '../stores/settings';
  import { analyticsStore } from '../stores/analytics';
  import { DollarSign, Settings, BarChart2, LogOut, User as UserIcon, Edit } from 'lucide-svelte';

  export let user: User;

  let menuOpen = false;
  let menuButton: HTMLElement;

  const dispatch = createEventDispatcher<{
    logout: void;
  }>();

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function handleLogout() {
    menuOpen = false;
    dispatch('logout');
  }
  
  function handleClickOutside(event: MouseEvent) {
    if (menuOpen && !menuButton.contains(event.target as Node)) {
      menuOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="profile-menu-wrapper" bind:this={menuButton}>
  <button class="profile-button" on:click={toggleMenu}>
    {#if user.profile_picture}
      <img src={user.profile_picture} alt="Profile" class="avatar" />
    {:else}
      <div class="default-avatar">
        <UserIcon size={20} />
      </div>
    {/if}
  </button>

  {#if menuOpen}
    <div class="menu-dropdown" transition:slide={{ duration: 200 }}>
      <div class="menu-header">
        <div class="user-info">
          {#if user.profile_picture}
            <img src={user.profile_picture} alt="Profile" class="header-avatar" />
          {:else}
            <div class="header-default-avatar">
              <UserIcon size={16} />
            </div>
          {/if}
          <div class="user-details">
            <span class="user-name">{user.username}</span>
            <span class="user-email">{user.email}</span>
          </div>
        </div>
      </div>
      <div class="menu-items">
        <a href="/upgrade" class="menu-item">
          <DollarSign size={16} />
          <span>Upgrade Plan</span>
        </a>
        <button class="menu-item" on:click={() => { menuOpen = false; settingsStore.openCustomizeModal(); }}>
          <Edit size={16} />
          <span>Customize Behavior</span>
        </button>
        <button class="menu-item" on:click={() => { menuOpen = false; settingsStore.openSettingsModal(); }}>
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button class="menu-item" on:click={() => { menuOpen = false; analyticsStore.openAnalyticsModal(); }}>
          <BarChart2 size={16} />
          <span>Analytics</span>
        </button>
      </div>
      <div class="menu-footer">
        <button class="logout-button" on:click={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-menu-wrapper {
    position: relative;
  }

  .profile-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    transition: transform 0.2s ease;
  }

  .profile-button:hover {
    transform: scale(1.1);
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .default-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 280px;
    background-color: var(--surface-color);
    border-radius: 12px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 0 0 1px var(--border-color);
    border: 1px solid var(--border-color);
    overflow: hidden;
    z-index: 1000;
    backdrop-filter: blur(20px);
  }

  .menu-header {
    padding: 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--hover-color);
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .header-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
  }
  
  .header-default-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--border-color);
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }
  
  .user-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-email {
    font-size: 0.75rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-items {
    padding: 0.5rem 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: var(--text-color);
    text-decoration: none;
    transition: background-color 0.2s ease;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .menu-item :global(svg) {
    display: block;
    color: currentColor;
  }

  .menu-item:hover {
    background-color: var(--hover-color);
  }

  .menu-footer {
    padding: 0.5rem;
    border-top: 1px solid var(--border-color);
  }

  .logout-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    font-size: 0.875rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-color);
    transition: background-color 0.2s ease;
    border-radius: 8px;
  }

  .logout-button:hover {
    background-color: var(--hover-color);
  }
  
  .logout-button :global(svg) {
    display: block;
    color: currentColor;
  }
</style>