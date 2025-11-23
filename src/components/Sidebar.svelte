<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Plus, MessageSquare, ChevronsLeft, ChevronsRight, Info, MoreVertical, Trash2, Edit3, Check, X } from 'lucide-svelte';
  import { historyStore, type HistoryItem } from '../stores/history';
  import { authStore } from '../stores/auth';
  import { chatStore } from '../stores/chat';
  import { sessionStore } from '../stores/session';
  import { isSidebarExpanded } from '../stores/sidebar';
  import { aboutModalStore } from '../stores/about';
  import { sessionUuidStore } from '../stores/sessionUuid';
  import { truncateText, formatTimestamp } from '../lib/utils';
  import { api } from '../lib/api';
  import ShareButton from './ShareButton.svelte';
  
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    newChat: void;
    selectHistory: { sessionNumber: number };
  }>();
  
  let activeDropdown: number | null = null;
  let activeSessionItem: HistoryItem | null = null;
  let dropdownPosition = { top: 0, left: 0 };
  let renamingSession: number | null = null;
  let renameInput = '';
  let localRenames: { [key: number]: string } = {};
  let isDeletingSession: number | null = null;
  let isHoveringLogo = false;
  
  function toggleSidebar() {
    if (disabled) return;
    isSidebarExpanded.update(n => !n);
  }
  
  function handleNewChat() {
    if (disabled) return;
    dispatch('newChat');
  }
  
  function handleHistoryClick(event: MouseEvent, item: HistoryItem) {
    if (disabled || renamingSession === item.session_number) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    closeAllDropdowns();
    dispatch('selectHistory', { sessionNumber: item.session_number });
  }
  
  function toggleDropdown(event: MouseEvent, item: HistoryItem) {
    event.stopPropagation();
    event.preventDefault();
    
    if (activeDropdown === item.session_number) {
      closeAllDropdowns();
    } else {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      dropdownPosition = {
        top: rect.top,
        left: rect.right + 8 // Slight gap
      };
      activeDropdown = item.session_number;
      activeSessionItem = item;
    }
  }
  
  function closeAllDropdowns() {
    activeDropdown = null;
    activeSessionItem = null;
    renamingSession = null;
  }
  
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.history-item-wrapper') && !target.closest('.dropdown-menu')) {
      closeAllDropdowns();
    }
  }
  
  function startRename(sessionNumber: number, currentPrompt: string) {
    renamingSession = sessionNumber;
    renameInput = localRenames[sessionNumber] || currentPrompt;
    activeDropdown = null;
    activeSessionItem = null;
    
    setTimeout(() => {
      const input = document.querySelector('.rename-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
  
  function saveRename(sessionNumber: number) {
    if (renameInput.trim()) {
      localRenames[sessionNumber] = renameInput.trim();
    }
    renamingSession = null;
    renameInput = '';
  }
  
  function cancelRename() {
    renamingSession = null;
    renameInput = '';
  }
  
  function handleRenameKeydown(event: KeyboardEvent, sessionNumber: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename(sessionNumber);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  }
  
  async function deleteSession(sessionNumber: number) {
    if (isDeletingSession) return;
    
    isDeletingSession = sessionNumber;
    activeDropdown = null;
    activeSessionItem = null;
    
    try {
      const response = await api.deleteSession(sessionNumber);
      
      if (localRenames[sessionNumber]) {
        delete localRenames[sessionNumber];
      }
      
      historyStore.update(history => history.filter(h => h.session_number !== sessionNumber));
      
      const currentPath = window.location.pathname;
      const uuid = sessionUuidStore.getUuidBySessionNumber(sessionNumber);
      if (uuid && currentPath === `/${uuid}`) {
        chatStore.clearMessages();
        history.pushState({}, '', '/');
      }
      
      console.log(`Session ${sessionNumber} deleted:`, response);
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      alert(`Failed to delete session: ${error.message}`);
    } finally {
      isDeletingSession = null;
    }
  }
  
  function getDisplayName(item: HistoryItem): string {
    return localRenames[item.session_number] || item.prompt;
  }
  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });
  
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
  
  $: historyItems = $historyStore;
</script>

<div class="sidebar-wrapper" class:expanded={$isSidebarExpanded} class:disabled>
  <aside 
    class="sidebar"
    role="navigation"
    aria-label="Chat history and actions"
  >
    <div class="sidebar-header">
      <!-- Brand / Toggle Area -->
      <button 
        class="brand"
        class:collapsed={!$isSidebarExpanded}
        on:click={toggleSidebar}
        on:mouseenter={() => isHoveringLogo = true}
        on:mouseleave={() => isHoveringLogo = false}
        title={$isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <div class="brand-icon-wrapper">
          {#if $isSidebarExpanded}
            <div class="brand-icon">
              <MessageSquare size={18} strokeWidth={1.5} />
            </div>
            <span class="brand-text">Deepthinks</span>
          {:else}
            <div class="brand-icon logo-as-button" class:hovered={isHoveringLogo}>
              {#if isHoveringLogo}
                <ChevronsRight size={18} strokeWidth={1.5} />
              {:else}
                <MessageSquare size={18} strokeWidth={1.5} />
              {/if}
            </div>
          {/if}
        </div>
        
        {#if $isSidebarExpanded}
          <div class="toggle-icon-inline">
            <ChevronsLeft size={16} strokeWidth={1.5} />
          </div>
        {/if}
      </button>
    </div>
    
    <div class="sidebar-content">
      <!-- New Chat Button -->
      <button 
        class="new-chat-btn" 
        class:expanded={$isSidebarExpanded}
        on:click={handleNewChat} 
        title="Start a new conversation"
        {disabled}
      >
        <div class="btn-icon">
          <Plus size={18} strokeWidth={1.5} />
        </div>
        {#if $isSidebarExpanded}
          <span class="btn-text">New Conversation</span>
        {/if}
      </button>
      
      <!-- History Section -->
      {#if $authStore.isAuthenticated && $isSidebarExpanded}
        <section class="history-section">
          <h2 class="history-header">Recent Chats</h2>
          <div class="history-list">
            {#each $historyStore as item, index (item.session_number)}
              <div class="history-item-wrapper" style="--delay: {index}">
                {#if renamingSession === item.session_number}
                  <div class="rename-container">
                    <input 
                      type="text" 
                      class="rename-input"
                      bind:value={renameInput}
                      on:keydown={(e) => handleRenameKeydown(e, item.session_number)}
                      on:blur={() => saveRename(item.session_number)}
                      maxlength="100"
                    />
                    <div class="rename-actions">
                      <button 
                        class="rename-action-btn save"
                        on:click={() => saveRename(item.session_number)}
                        title="Save"
                      >
                        <Check size={14} strokeWidth={1.5} />
                      </button>
                      <button 
                        class="rename-action-btn cancel"
                        on:click={cancelRename}
                        title="Cancel"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                {:else}
                  <a 
                    href="/{sessionUuidStore.getUuidBySessionNumber(item.session_number) || ''}"
                    class="history-item"
                    class:active={$sessionStore.currentSession === item.session_number}
                    class:deleting={isDeletingSession === item.session_number}
                    on:click={(e) => handleHistoryClick(e, item)}
                    title={`Continue chat: ${getDisplayName(item)}`}
                    aria-disabled={disabled}
                  >
                    <div class="history-content">
                      <span class="history-prompt">{truncateText(getDisplayName(item), 35)}</span>
                    </div>
                    
                    <button 
                      class="more-btn"
                      on:click={(e) => toggleDropdown(e, item)}
                      title="More options"
                      disabled={isDeletingSession === item.session_number}
                    >
                      <MoreVertical size={14} strokeWidth={1.5} />
                    </button>
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}
      
      <!-- Bottom Actions -->
      <div class="bottom-actions" class:expanded={$isSidebarExpanded}>
        {#if !$chatStore.isInitialState && $authStore.isAuthenticated}
          <ShareButton expanded={$isSidebarExpanded} />
        {/if}
        <button 
          class="action-btn"
          class:expanded={$isSidebarExpanded}
          title="About"
          on:click={() => aboutModalStore.openModal()}
          {disabled}
        >
          <div class="btn-icon">
            <Info size={18} strokeWidth={1.5} />
          </div>
          {#if $isSidebarExpanded}
            <span class="btn-text">About</span>
          {/if}
        </button>
      </div>
    </div>
  </aside>
  
  <!-- Dropdown Menu (Fixed Position) -->
  {#if activeDropdown !== null && activeSessionItem}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div 
      class="dropdown-menu" 
      style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px"
      on:click|stopPropagation
    >
      <div class="dropdown-info">
        <span class="dropdown-date">{formatTimestamp(activeSessionItem.timestamp)}</span>
      </div>
      <button 
        class="dropdown-item"
        on:click={() => startRename(activeSessionItem.session_number, activeSessionItem.prompt)}
      >
        <Edit3 size={14} strokeWidth={1.5} />
        <span>Rename</span>
      </button>
      <button 
        class="dropdown-item delete"
        on:click={() => deleteSession(activeSessionItem.session_number)}
      >
        <Trash2 size={14} strokeWidth={1.5} />
        <span>Delete</span>
      </button>
    </div>
  {/if}
</div>

<style>
  /* --- Design System: Warm Editorial --- */
  :global(:root) {
    /* Light Mode - Warm Paper */
    --sb-bg: #F9F8F6;
    --sb-text: #2C2C2C;
    --sb-text-muted: #787570;
    --sb-border: rgba(0, 0, 0, 0.04);
    --sb-hover: rgba(44, 44, 44, 0.04);
    --sb-active-bg: #EBE9E5;
    --sb-accent: #667eea; /* Keeping brand color but using it subtly */
    --sb-accent-muted: rgba(102, 126, 234, 0.08);
    --sb-font-serif: "Merriweather", "Georgia", serif;
    --sb-font-sans: "Inter", system-ui, sans-serif;
  }

  :global([data-theme="dark"]) {
    /* Dark Mode - Warm Charcoal */
    --sb-bg: #1C1B1A;
    --sb-text: #E6E4E0;
    --sb-text-muted: #9C9A96;
    --sb-border: rgba(255, 255, 255, 0.04);
    --sb-hover: rgba(255, 255, 255, 0.04);
    --sb-active-bg: #2A2928;
    --sb-accent-muted: rgba(102, 126, 234, 0.15);
  }

  /* --- Main Structure --- */
  .sidebar-wrapper {
    position: relative;
    transition: width 0.5s cubic-bezier(0.19, 1, 0.22, 1); /* Slower, more elegant easing */
    width: var(--sidebar-collapsed-width, 60px);
    font-family: var(--sb-font-sans);
  }
  .sidebar-wrapper.expanded {
    width: var(--sidebar-expanded-width, 300px);
  }
  .sidebar-wrapper.disabled {
    pointer-events: none;
    opacity: 0.8;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: var(--sidebar-collapsed-width, 60px);
    background: var(--sb-bg);
    border-right: 1px solid var(--sb-border);
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    z-index: 100;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .sidebar-wrapper.expanded .sidebar {
    width: var(--sidebar-expanded-width, 300px);
  }
  
  /* --- Header with Brand/Toggle --- */
  .sidebar-header {
    flex-shrink: 0;
    padding: 1.5rem 1rem 0.5rem 1rem; /* More top padding */
  }
  
  .brand {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 8px;
    color: var(--sb-text);
  }
  
  .brand.collapsed {
    justify-content: center;
    padding: 0.75rem 0;
  }
  
  .brand:hover {
    background: var(--sb-hover);
  }
  
  .brand-icon-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .brand-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sb-text);
    transition: all 0.3s ease;
  }
  
  .brand-icon.logo-as-button {
    cursor: pointer;
  }
  
  .brand-icon.logo-as-button.hovered {
    color: var(--sb-accent);
    transform: scale(1.05);
  }
  
  .brand-text {
    font-family: var(--sb-font-serif);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--sb-text);
    white-space: nowrap;
    opacity: 0;
    animation: fadeInSlide 0.5s ease forwards 0.1s;
    letter-spacing: -0.01em;
  }
  
  .toggle-icon-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sb-text-muted);
    transition: all 0.2s ease;
    opacity: 0;
    animation: fadeInSlide 0.5s ease forwards 0.2s;
  }
  
  /* --- Content Area --- */
  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem 0;
    overflow: hidden;
  }

  /* --- Buttons --- */
  .new-chat-btn, .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 400;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    margin: 0 auto;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    text-decoration: none;
    color: var(--sb-text);
  }
  .new-chat-btn.expanded, .action-btn.expanded {
    width: calc(100% - 2rem);
    justify-content: flex-start;
    gap: 0.75rem;
    padding: 0 0.75rem;
    min-height: 40px;
    margin: 0 1rem;
  }
  
  .new-chat-btn {
    background: transparent;
    border: 1px solid var(--sb-border);
    margin-bottom: 1rem;
  }
  .new-chat-btn:hover {
    background: var(--sb-hover);
    border-color: transparent;
  }
  
  .action-btn {
    background: transparent;
    color: var(--sb-text-muted);
  }
  .action-btn:hover {
    background: var(--sb-hover);
    color: var(--sb-text);
  }

  .btn-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-text {
    opacity: 0;
    animation: fadeInSlide 0.5s ease forwards 0.1s;
    font-size: 0.9rem;
    letter-spacing: 0.01em;
  }

  /* --- History --- */
  .history-section {
    flex: 1;
    margin-top: 1rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .history-header {
    padding: 0 1.5rem;
    margin-bottom: 0.75rem;
    font-family: var(--sb-font-serif);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--sb-text-muted);
    letter-spacing: 0.05em;
    opacity: 0;
    animation: fadeInSlide 0.5s ease forwards 0.2s;
  }
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 0.75rem;
    /* Subtle scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--sb-border) transparent;
  }
  
  .history-item-wrapper {
    position: relative;
    width: 100%;
    margin-bottom: 2px;
    opacity: 0;
    animation: fadeInSlide 0.5s ease forwards;
    animation-delay: calc(0.2s + var(--delay, 0) * 0.03s);
  }
  
  .history-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    text-decoration: none;
    color: var(--sb-text-muted);
  }
  
  .history-item.deleting {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .history-item:hover {
    background: var(--sb-hover);
    color: var(--sb-text);
  }

  .history-item.active {
    background: var(--sb-active-bg);
    color: var(--sb-text);
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .history-item.active .history-prompt {
    font-weight: 600;
  }
  
  .history-content {
    flex: 1;
    min-width: 0;
  }
  .history-prompt {
    font-size: 0.875rem;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 400;
    display: block;
  }
  
  /* --- More Button & Dropdown --- */
  .more-btn {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--sb-text-muted);
    opacity: 0;
    transition: all 0.2s ease;
  }
  
  .history-item:hover .more-btn {
    opacity: 1;
  }
  
  .more-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--sb-text);
  }
  
  .dropdown-menu {
    position: fixed;
    background: var(--sb-bg);
    border: 1px solid var(--sb-border);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    padding: 6px;
    z-index: 9999;
    min-width: 160px;
    animation: dropdownFadeIn 0.2s ease;
  }
  
  .dropdown-info {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--sb-border);
    margin-bottom: 4px;
  }
  
  .dropdown-date {
    font-size: 0.75rem;
    color: var(--sb-text-muted);
    font-weight: 500;
  }
  
  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--sb-text);
    transition: all 0.2s ease;
    text-align: left;
  }
  
  .dropdown-item:hover {
    background: var(--sb-hover);
  }
  
  .dropdown-item.delete {
    color: #ef4444;
  }
  
  .dropdown-item.delete:hover {
    background: rgba(239, 68, 68, 0.08);
  }
  
  /* --- Rename Input --- */
  .rename-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    background: var(--sb-active-bg);
    border-radius: 6px;
    border: 1px solid var(--sb-accent);
  }
  
  .rename-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--sb-text);
    padding: 0;
  }
  
  .rename-actions {
    display: flex;
    gap: 2px;
  }
  
  .rename-action-btn {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .rename-action-btn.save {
    color: #10b981;
  }
  .rename-action-btn.save:hover {
    background: rgba(16, 185, 129, 0.1);
  }
  .rename-action-btn.cancel {
    color: var(--sb-text-muted);
  }
  .rename-action-btn.cancel:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  /* --- Bottom Actions --- */
  .bottom-actions {
    margin-top: auto;
    padding: 1rem 0;
    border-top: 1px solid var(--sb-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .bottom-actions.expanded {
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  /* --- Animations --- */
  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* --- Scrollbar --- */
  .history-list::-webkit-scrollbar { width: 4px; }
  .history-list::-webkit-scrollbar-track { background: transparent; }
  .history-list::-webkit-scrollbar-thumb { 
    background: var(--sb-border); 
    border-radius: 2px;
  }
  .history-list::-webkit-scrollbar-thumb:hover { 
    background: var(--sb-text-muted); 
  }

  /* --- Responsive --- */
  @media (max-width: 768px) {
    .sidebar-wrapper {
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 300px;
      z-index: 101;
      transform: translateX(-100%);
      transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .sidebar-wrapper.expanded {
      transform: translateX(0);
    }
    .sidebar {
      width: 100%;
    }
    .brand { padding: 0.875rem 1rem; }
    .brand-icon { width: 28px; height: 28px; }
    .new-chat-btn, .action-btn {
      width: 36px;
      height: 36px;
    }
    .new-chat-btn.expanded, .action-btn.expanded {
      min-height: 40px;
    }
    .btn-icon { width: 36px; height: 36px; }
    .history-list { padding: 0 0.75rem; }
    .bottom-actions { padding: 1rem 0; }
  }
</style>