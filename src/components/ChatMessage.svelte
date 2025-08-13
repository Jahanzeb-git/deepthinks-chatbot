<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { renderMath } from '../lib/katex';
  import { User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, AlertTriangle } from 'lucide-svelte';
  import type { ChatMessage } from '../stores/chat';
  import ReasoningBlock from './shared/ReasoningBlock.svelte';

  export let message: ChatMessage;
  export let isLastAiMessage: boolean = false;
  export let isSharedView: boolean = false;

  let messageElement: HTMLDivElement;
  let mounted = false;
  let copied = false;

  const dispatch = createEventDispatcher<{
    regenerate: { messageId: string }
  }>();

  let segments: { type: 'normal' | 'thinking'; content: string; }[] = [];

  $: {
    if (message.type === 'ai') {
      const parts = message.content.split(/(<think>|<\/think>)/g);
      const newSegments = [];
      let inThinkingBlock = false;
      for (const part of parts) {
        if (part === '<think>') {
          inThinkingBlock = true;
        } else if (part === '</think>') {
          inThinkingBlock = false;
        } else if (part) {
          newSegments.push({
            type: inThinkingBlock ? 'thinking' : 'normal',
            content: part,
          });
        }
      }
      segments = newSegments;
    } else {
      segments = [{ type: 'normal', content: message.content }];
    }
  }

  $: tokenCount = message.tokenCount !== undefined
    ? message.tokenCount
    : message.content.split(/\s+/).filter(Boolean).length;

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function handleRegenerate() {
    dispatch('regenerate', { messageId: message.id });
  }

  onMount(() => {
    mounted = true;
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });
</script>

<div 
  bind:this={messageElement}
  class="message-container {message.type}" 
  class:mounted
  class:streaming={message.isStreaming}
>
  {#if message.type === 'user'}
    <div class="message-avatar">
      <User size={18} />
    </div>
  {/if}
  
  <div class="message-content">
    {#if message.type === 'ai'}
      <div class="ai-message" use:renderMath>
        {#each segments as segment}
          {#if segment.type === 'thinking'}
            <ReasoningBlock content={segment.content} streaming={message.isStreaming} />
          {:else}
            {@html renderMarkdown(segment.content)}
          {/if}
        {/each}
        {#if message.isStreaming && !segments.some(s => s.type === 'thinking')}
          <span class="cursor">|</span>
        {/if}
      </div>
    {:else}
      <div class="user-message">
        {message.content}
      </div>
    {/if}
  </div>
</div>

{#if message.type === 'ai' && !message.isStreaming && (message.content || message.interrupted)}
  <div class="message-actions">
    <div class="token-count">
      {tokenCount} tokens
    </div>
    <button class="action-btn" on:click={handleCopy} title="Copy">
      {#if copied}
        <Check size={16} />
      {:else}
        <Copy size={16} />
      {/if}
    </button>
    <button class="action-btn" title="Good response" disabled={isSharedView}>
      <ThumbsUp size={16} />
    </button>
    <button class="action-btn" title="Bad response" disabled={isSharedView}>
      <ThumbsDown size={16} />
    </button>
    {#if isLastAiMessage}
      <button class="action-btn" on:click={handleRegenerate} title="Regenerate response" disabled={isSharedView}>
        <RefreshCw size={16} />
      </button>
    {/if}

    {#if message.interrupted}
      <div class="interrupted-indicator">
        <AlertTriangle size={14} />
        <span>Interrupted</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .message-container {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.5rem; /* Reduced margin */
    opacity: 0;
    transform: translateY(10px);
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  
  .message-container.mounted {
    opacity: 1;
    transform: translateY(0);
  }
  
  .message-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.25rem;
  }
  
  .user .message-avatar {
    background: var(--primary-color);
    color: white;
  }
  
  .message-container.ai {
    gap: 0;
  }
  
  .message-content {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  
  .user-message {
    background: var(--primary-color);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 18px 18px 4px 18px;
    font-weight: 500;
    word-wrap: break-word;
    display: inline-block;
    max-width: 100%;
    font-family: 'Nunito', sans-serif;
  }
  
  .ai-message {
    font-family: 'Nunito', sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    word-wrap: break-word;
    display: inline-block;
    max-width: 100%;
    text-align: left;
  }

  .message-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0; /* Aligns with message content */
    margin-bottom: 1.5rem;
    padding-top: 0.5rem;
  }

  .interrupted-indicator {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-left: auto;
    font-style: italic;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    background-color: var(--hover-color);
  }

  .token-count {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
  }

  .action-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--hover-color);
    color: var(--text-color);
    border-color: var(--primary-color);
  }

  .action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  .ai-message :global(p) {
    margin: 0 0 1rem 0;
  }
  
  .ai-message :global(p:last-child) {
    margin-bottom: 0;
  }
  
  .ai-message :global(pre) {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .ai-message :global(code) {
    background: var(--surface-color);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
  }
  
  .ai-message :global(pre code) {
    background: transparent;
    padding: 0;
  }
  
  .ai-message :global(ul), .ai-message :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  .ai-message :global(blockquote) {
    border-left: 3px solid var(--primary-color);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: var(--text-muted);
  }

  .thinking-block {
    display: block;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin: 1rem 0;
    background: var(--surface-color);
  }
  
  .cursor {
    animation: blink 1s infinite;
    color: var(--primary-color);
    font-weight: bold;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  @media (max-width: 768px) {
    .message-container {
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .message-avatar {
      width: 28px;
      height: 28px;
    }
    
    .user-message {
      padding: 0.6rem 0.8rem;
      border-radius: 16px 16px 4px 16px;
      font-size: 0.9rem;
    }
    
    .ai-message {
      font-size: 0.9rem;
    }
  }
</style>
