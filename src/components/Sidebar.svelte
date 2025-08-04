<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus, MessageSquare, ChevronsLeft, ChevronsRight, Info } from 'lucide-svelte';
  import { historyStore, type HistoryItem } from '../stores/history';
  import { authStore } from '../stores/auth';
  import { isSidebarExpanded } from '../stores/sidebar';
  import { aboutModalStore } from '../stores/about';
  import { truncateText, formatTimestamp } from '../lib/utils';
  
  const dispatch = createEventDispatcher<{
    newChat: void;
    selectHistory: { sessionNumber: number };
  }>();
  
  function toggleSidebar() {
    isSidebarExpanded.update(n => !n);
  }
  
  function handleNewChat() {
    dispatch('newChat');
  }
  
  function handleHistoryClick(item: HistoryItem) {
    dispatch('selectHistory', { sessionNumber: item.session_number });
  }
  
  // Force reactivity for history updates
  $: historyItems = $historyStore;
</script>

<div class="sidebar-wrapper" class:expanded={$isSidebarExpanded}>
  <aside 
    class="sidebar"
    role="navigation"
    aria-label="Chat history and actions"
  >
    <div class="sidebar-content">
      <!-- Branding -->
      <div class="brand">
        <div class="brand-icon">
          <MessageSquare size={20} />
        </div>
        {#if $isSidebarExpanded}
          <span class="brand-text">Deepthinks</span>
        {/if}
      </div>
    
    <!-- New Chat Button -->
    <button 
      class="new-chat-btn" 
      class:expanded={$isSidebarExpanded}
      on:click={handleNewChat} 
      title="Start a new conversation"
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
            <button 
              class="history-item"
              on:click={() => handleHistoryClick(item)}
              title={`Continue chat: ${item.prompt}`}
              style="--delay: {index}"
            >
              <div class="history-icon">
                <MessageSquare size={14} />
              </div>
              <div class="history-content">
                <span class="history-prompt">{truncateText(item.prompt, 35)}</span>
                <span class="history-time">{formatTimestamp(item.timestamp)}</span>
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/if}
    
    <!-- Bottom Actions -->
    <div class="bottom-actions">
      <button 
        class="action-btn"
        class:expanded={$isSidebarExpanded}
        title="About"
        on:click={() => aboutModalStore.openModal()}
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
  <div class="desktop-toggle-btn">
  <button 
    class="toggle-btn" 
    on:click={toggleSidebar} 
    aria-label={$isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
    title={$isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
  >
    <div class="toggle-icon">
      {#if $isSidebarExpanded}
        <ChevronsLeft size={18} />
      {:else}
        <ChevronsRight size={18} />
      {/if}
    </div>
  </button>
  </div>
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
  }
  .sidebar-wrapper.expanded .sidebar {
    width: var(--sidebar-expanded-width, 300px);
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.12);
  }
  
  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.25rem 0;
  }

  /* --- Toggle Button --- */
  .toggle-btn {
    position: fixed;
    top: 1.25rem;
    left: calc(var(--sidebar-collapsed-width, 60px) + 5px);
    width: 32px;
    height: 32px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    z-index: 110;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 0;
  }
  .toggle-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
    transform: scale(1.1);
  }
  
  .toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
  }
  
  .toggle-icon :global(svg) {
    display: block;
    color: currentColor;
  }
  
  .sidebar-wrapper.expanded .toggle-btn {
    left: calc(var(--sidebar-expanded-width, 300px) + 5px);
  }

  /* --- Brand --- */
  .brand {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0 1.25rem;
    margin-bottom: 2rem;
    min-height: 44px;
  }
  .brand-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    background: rgba(102, 126, 234, 0.1);
    border-radius: 6px;
  }
  .brand-text {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-color);
    white-space: nowrap;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards 0.1s;
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
    background: var(--primary-color); /* You can define --primary-hover if needed */
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
  .history-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem;
    margin-bottom: 0.25rem;
    background: transparent;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    text-align: left;
    opacity: 0;
    animation: fadeInSlide 0.4s ease forwards;
    animation-delay: calc(0.3s + var(--delay, 0) * 0.05s);
    position: relative;
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

  /* --- Bottom Actions --- */
  .bottom-actions {
    margin-top: auto;
    padding: 1.25rem 0;
    border-top: 1px solid var(--border-color);
  }
  
  /* --- Animations --- */
  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* --- Scrollbar --- */
  .history-list::-webkit-scrollbar { width: 3px; }
  .history-list::-webkit-scrollbar-track { background: transparent; }
  .history-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
  .history-list::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

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
  .desktop-toggle-btn {
    display: none;
  }
    .brand { padding: 0 1rem; margin-bottom: 1.5rem; }
    .brand-icon { width: 24px; height: 24px; }
    .new-chat-btn, .action-btn {
      width: 36px;
      height: 36px;
    }
    .new-chat-btn.expanded, .action-btn.expanded {
      min-height: 36px;
    }
    .btn-icon { width: 36px; height: 36px; }
    .history-list { padding: 0 0.75rem; }
    .bottom-actions { padding: 1rem 0; }
  }
</style>
