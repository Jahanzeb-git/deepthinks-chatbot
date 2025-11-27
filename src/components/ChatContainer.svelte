<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { chatStore } from '../stores/chat';
  import ChatMessage from './ChatMessage.svelte';
  import CustomLoading from './CustomLoading.svelte';
  import BootingContainer from './BootingContainer.svelte';

  import { Info } from 'lucide-svelte';
  
  export let isSharedView = false;
  export let showBootUI = false;

  let chatContainer: HTMLDivElement;
  let shouldAutoScroll = true;

  const dispatch = createEventDispatcher();
  
  $: messages = $chatStore.messages;
  $: isLoading = $chatStore.isLoading;
  $: isInitialState = $chatStore.isInitialState;

  // Find the last AI message to conditionally show the "Try Again" button
  $: lastAiMessageId = [...messages].reverse().find(m => m.type === 'ai')?.id;
  
  function scrollToBottom() {
    if (chatContainer && shouldAutoScroll) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
  
  function handleScroll() {
    if (chatContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      shouldAutoScroll = scrollTop + clientHeight >= scrollHeight - 100;
    }
  }

  function handleRegenerate(event: CustomEvent) {
    dispatch('regenerate', event.detail);
  }
  
  afterUpdate(() => {
    scrollToBottom();
  });
  
  onMount(() => {
    scrollToBottom();
  });
</script>

{#if !isInitialState}
  <div 
    bind:this={chatContainer}
    class="chat-container"
    on:scroll={handleScroll}
  >
    {#if isSharedView}
      <div class="shared-view-info">
        <div class="info-icon">
          <Info size={20} />
        </div>
        <p>
          You're viewing a shared conversation in read-only mode. All interactive elements are disabled. 
          To engage with the full application and start your own conversation, please visit: 
          <a href="https://deepthinks.netlify.app" target="_blank" rel="noopener noreferrer">https://deepthinks.netlify.app</a>
        </p>
      </div>
    {/if}
    <div class="messages-wrapper">
      {#each messages as message (message.id)}
        <ChatMessage 
          messageId={message.id} 
          {isSharedView}
          isLastAiMessage={message.id === lastAiMessageId}
          on:regenerate={handleRegenerate} 
        />
      {/each}
      
      {#if isLoading}
        <div class="loading-message">
          <div class="message-avatar ai">
            <CustomLoading />
          </div>
          {#if showBootUI}
            <BootingContainer 
              mode="inline" 
              showBootCountdown={true}
              onComplete={() => {}} 
            />
          {:else}
            <BootingContainer 
              mode="inline" 
              showBootCountdown={false}
              onComplete={() => {}} 
            />
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .chat-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 2rem;
    background: var(--sb-bg, #F9F8F6);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  :global([data-theme="dark"]) .chat-container {
    background: var(--sb-bg, #1C1B1A);
  }

  .shared-view-info {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 2rem;
    max-width: 768px;
    margin-left: auto;
    margin-right: auto;
  }

  .info-icon {
    flex-shrink: 0;
    color: var(--primary-color);
    margin-top: 0.125rem;
  }

  .shared-view-info p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .shared-view-info a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
  }

  .shared-view-info a:hover {
    text-decoration: underline;
  }
  
  .messages-wrapper {
    max-width: 768px;
    margin: 0 auto;
    padding-bottom: 2rem;
  }
  
  .loading-message {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .message-avatar.ai {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    margin-top: 0.25rem;
  }
  
  /* Scrollbar styling */
  .chat-container::-webkit-scrollbar {
    width: 6px;
  }
  
  .chat-container::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .chat-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
  
  .chat-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
  
  @media (max-width: 768px) {
    .chat-container {
      padding: 1rem;
    }

    .shared-view-info {
      padding: 1rem;
      margin-bottom: 1rem;
    }
    
    .messages-wrapper {
      padding-bottom: 1rem;
    }
    
    .loading-message {
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .message-avatar.ai {
      width: 28px;
      height: 28px;
    }
  }
</style>
