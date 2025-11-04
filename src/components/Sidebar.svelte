<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Plus, MessageSquare, ChevronsLeft, ChevronsRight, Info, MoreVertical, Trash2, Edit3, Check, X } from 'lucide-svelte';
  import { historyStore, type HistoryItem } from '../stores/history';
  import { authStore } from '../stores/auth';
  import { chatStore } from '../stores/chat';
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
  
  function toggleDropdown(event: MouseEvent, sessionNumber: number) {
    event.stopPropagation();
    event.preventDefault();
    if (activeDropdown === sessionNumber) {
      activeDropdown = null;
    } else {
      activeDropdown = sessionNumber;
    }
  }
  
  function closeAllDropdowns() {
    activeDropdown = null;
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
              <MessageSquare size={20} />
            </div>
            <span class="brand-text">Deepthinks</span>
          {:else}
            <div class="brand-icon logo-as-button" class:hovered={isHoveringLogo}>
              {#if isHoveringLogo}
                <ChevronsRight size={20} />
              {:else}
                <MessageSquare size={20} />
              {/if}
            </div>
          {/if}
        </div>
        
        {#if $isSidebarExpanded}
          <div class="toggle-icon-inline">
            <ChevronsLeft size={18} />
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
          <Plus size={$isSidebarExpanded ? 18 : 20} />
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
                        <Check size={14} />
                      </button>
                      <button 
                        class="rename-action-btn cancel"
                        on:click={cancelRename}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                {:else}
                  <a 
                    href="/{sessionUuidStore.getUuidBySessionNumber(item.session_number) || ''}"
                    class="history-item"
                    class:deleting={isDeletingSession === item.session_number}
                    on:click={(e) => handleHistoryClick(e, item)}
                    title={`Continue chat: ${getDisplayName(item)}`}
                    aria-disabled={disabled}
                  >
                    <div class="history-icon">
                      <MessageSquare size={14} />
                    </div>
                    <div class="history-content">
                      <span class="history-prompt">{truncateText(getDisplayName(item), 35)}</span>
                      <span class="history-time">{formatTimestamp(item.timestamp)}</span>
                    </div>
                    
                    <button 
                      class="more-btn"
                      on:click={(e) => toggleDropdown(e, item.session_number)}
                      title="More options"
                      disabled={isDeletingSession === item.session_number}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </a>
                  
                  {#if activeDropdown === item.session_number}
                    <div class="dropdown-menu" on:click|stopPropagation>
                      <button 
                        class="dropdown-item"
                        on:click={() => startRename(item.session_number, item.prompt)}
                      >
                        <Edit3 size={14} />
                        <span>Rename</span>
                      </button>
                      <button 
                        class="dropdown-item delete"
                        on:click={() => deleteSession(item.session_number)}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  {/if}
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
            <Info size={$isSidebarExpanded ? 18 : 20} />
          </div>
          {#if $isSidebarExpanded}
            <span class="btn-text">About</span>
          {/if}
        </button>
      </div>
    </div>
  </aside>
</div>

<style>
  /* --- Main Structure --- */
  .sidebar-wrapper {
    position: relative;
    transition: width 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    width: var(--sidebar-collapsed-width, 60px);
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
    background: var(--surface-color);
    border-right: 1px solid var(--border-color);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
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
    border-bottom: 1px solid var(--border-color);
  }
  
  .brand {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .brand.collapsed {
    justify-content: center;
    padding: 1rem 0;
  }
  
  .brand:hover {
    background: var(--hover-color);
  }
  
  .brand-icon-wrapper {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }
  
  .brand-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    background: rgba(102, 126, 234, 0.1);
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .brand-icon.logo-as-button {
    cursor: pointer;
  }
  
  .brand-icon.logo-as-button.hovered {
    background: var(--primary-color);
    color: white;
    transform: scale(1.05);
  }
  
  .brand-text {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-color);
    white-space: nowrap;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.1s;
  }
  
  .toggle-icon-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    color: var(--text-muted);
    transition: all 0.2s ease;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.2s;
  }
  
  .brand:hover .toggle-icon-inline {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-color);
  }
  
  /* --- Content Area --- */
  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.25rem 0;
    overflow: hidden;
  }

  /* --- Buttons --- */
  .new-chat-btn, .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    font-weight: 500;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    margin: 0 auto;
    border-radius: 10px;
    width: 40px;
    height: 40px;
    text-decoration: none;
  }
  .new-chat-btn.expanded, .action-btn.expanded {
    width: calc(100% - 2rem);
    justify-content: flex-start;
    gap: 0.875rem;
    padding: 0;
    min-height: 44px;
  }
  
  .new-chat-btn {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
  }
  .new-chat-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  }
  
  .action-btn {
    background: transparent;
    color: var(--text-muted);
  }
  .action-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: var(--hover-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .action-btn:hover::before {
    opacity: 1;
  }
  .action-btn:hover {
    color: var(--text-color);
  }

  .btn-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .btn-text {
    padding-right: 1.25rem;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.1s;
    font-size: 0.9rem;
    position: relative;
    z-index: 1;
  }

  /* --- History --- */
  .history-section {
    flex: 1;
    margin-top: 1.5rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .history-header {
    padding: 0 1.25rem;
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.2s;
  }
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%);
  }
  
  .history-item-wrapper {
    position: relative;
    width: 100%;
    margin-bottom: 0.25rem;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards;
    animation-delay: calc(0.3s + var(--delay, 0) * 0.05s);
  }
  
  .history-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem;
    background: transparent;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    text-align: left;
    position: relative;
    text-decoration: none;
  }
  
  .history-item.deleting {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .history-item::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: var(--hover-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .history-item:hover::before {
    opacity: 1;
  }
  .history-item:hover {
    transform: translateX(2px);
  }
  
  .history-item:hover .more-btn {
    opacity: 1;
  }
  
  .history-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: rgba(102, 126, 234, 0.08);
    border-radius: 6px;
    margin-top: 2px;
    position: relative;
    z-index: 1;
  }
  .history-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
    position: relative;
    z-index: 1;
  }
  .history-prompt {
    font-size: 0.875rem;
    color: var(--text-color);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .history-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
  }
  
  /* --- More Button & Dropdown --- */
  .more-btn {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-muted);
    opacity: 0;
    transition: all 0.2s ease;
    position: relative;
    z-index: 2;
  }
  
  .more-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-color);
  }
  
  .more-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 8px;
    margin-top: 4px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 6px;
    z-index: 1000;
    min-width: 160px;
    animation: dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    transition: all 0.2s ease;
    text-align: left;
  }
  
  .dropdown-item:hover {
    background: var(--hover-color);
  }
  
  .dropdown-item.delete {
    color: #ef4444;
  }
  
  .dropdown-item.delete:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  /* --- Rename Input --- */
  .rename-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    background: var(--hover-color);
    border-radius: 10px;
    border: 1.5px solid var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  .rename-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--text-color);
    font-weight: 500;
    padding: 0;
  }
  
  .rename-actions {
    display: flex;
    gap: 4px;
  }
  
  .rename-action-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .rename-action-btn.save {
    color: #10b981;
  }
  
  .rename-action-btn.save:hover {
    background: rgba(16, 185, 129, 0.15);
  }
  
  .rename-action-btn.cancel {
    color: var(--text-muted);
  }
  
  .rename-action-btn.cancel:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-color);
  }

  /* --- Bottom Actions --- */
  .bottom-actions {
    margin-top: auto;
    padding: 1.25rem 0;
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .bottom-actions.expanded {
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
  }
  
  /* --- Animations --- */
  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* --- Scrollbar --- */
  .history-list::-webkit-scrollbar { width: 4px; }
  .history-list::-webkit-scrollbar-track { background: transparent; }
  .history-list::-webkit-scrollbar-thumb { 
    background: var(--border-color); 
    border-radius: 2px;
  }
  .history-list::-webkit-scrollbar-thumb:hover { 
    background: var(--text-muted); 
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