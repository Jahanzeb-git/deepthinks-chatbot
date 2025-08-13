<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { chatStore } from '../stores/chat';
  import ChatMessage from './ChatMessage.svelte';
  import CustomLoading from './CustomLoading.svelte';
  
  export let isSharedView = false;

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
    <div class="messages-wrapper">
      {#each messages as message (message.id)}
        <ChatMessage 
          {message} 
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
    background: var(--background-color);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
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
