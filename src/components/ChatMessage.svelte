<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { renderMath } from '../lib/katex';
  import { User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, AlertTriangle } from 'lucide-svelte';
  import type { ChatMessage } from '../stores/chat';
  import { artifactStore } from '../stores/artifact';
  import ReasoningBlock from './shared/ReasoningBlock.svelte';
  import FileCard from './shared/FileCard.svelte';

  export let message: ChatMessage;
  export let isLastAiMessage: boolean = false;
  export let isSharedView: boolean = false;

  let messageElement: HTMLDivElement;
  let mounted = false;
  let copied = false;

  const dispatch = createEventDispatcher<{
    regenerate: { messageId: string }
  }>();

  type RenderedBlock = {
    id: number;
    type: 'text' | 'file' | 'conclusion' | 'file_text';
    content: string;
    filename?: string;
  };

  let renderedBlocks: RenderedBlock[] = [];

  $: {
    if (message.type === 'ai' && message.mode === 'code') {
      renderedBlocks = parseCodeStream(message.content);
    } else if (message.type === 'ai') {
      const parts = message.content.split(/(<think>|<\/think>)/g);
      const newSegments = [];
      let inThinkingBlock = false;
      for (const part of parts) {
        if (part === '<think>') inThinkingBlock = true;
        else if (part === '</think>') inThinkingBlock = false;
        else if (part) newSegments.push({ type: inThinkingBlock ? 'thinking' : 'normal', content: part });
      }
      renderedBlocks = [{ id: 0, type: 'text', content: newSegments.map(s => s.content).join('') }];
    }
  }

  function parseCodeStream(content: string): RenderedBlock[] {
    // This is a rudimentary parser and may not be fully robust.
    const blocks: RenderedBlock[] = [];
    let idCounter = 0;

    const textContent = content.match(/"Text":\s*"(.*?)"/s)?.[1] || '';
    if (textContent) {
        blocks.push({ id: idCounter++, type: 'text', content: textContent.replace(/\\n/g, '\n') });
    }

    const filesContent = content.match(/"Files":\s*\[(.*?)\]/s)?.[1] || '';
    if (filesContent) {
        const fileRegex = /\{\s*\"FileName\":\s*\"(.*?)\",\s*\"FileCode\":\s*\"(.*?)\",\s*\"FileText\":\s*\"(.*?)\"\s*\}\s*/gs;
        let match;
        while ((match = fileRegex.exec(filesContent)) !== null) {
            const [_, fileName, fileCode, fileText] = match;
            blocks.push({ id: idCounter++, type: 'file', content: '', filename: fileName });
            artifactStore.open(fileName, fileCode.replace(/\\n/g, '\n').replace(/\\\"/g, '"'));
            if (fileText) {
                blocks.push({ id: idCounter++, type: 'file_text', content: fileText.replace(/\\n/g, '\n') });
            }
        }
    }

    const conclusionContent = content.match(/"Conclusion":\s*"(.*?)"/s)?.[1] || '';
    if (conclusionContent) {
        blocks.push({ id: idCounter++, type: 'conclusion', content: conclusionContent.replace(/\\n/g, '\n') });
    }

    return blocks;
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
      {#if message.mode === 'code'}
        <div class="code-message" use:renderMath>
          {#each renderedBlocks as block (block.id)}
            {#if block.type === 'text' || block.type === 'conclusion' || block.type === 'file_text'}
              <div class="markdown-content">{@html renderMarkdown(block.content)}</div>
            {:else if block.type === 'file'}
              <FileCard filename={block.filename || ''} />
            {/if}
          {/each}
          {#if message.isStreaming && renderedBlocks.length === 0}
            <span class="cursor">|</span>
          {/if}
        </div>
      {:else}
        <div class="ai-message" use:renderMath>
          {@html renderMarkdown(message.content)} 
          {#if message.isStreaming}<span class="cursor">|</span>{/if}
        </div>
      {/if}
    {:else}
      <div class="user-message">
        {message.content}
      </div>
    {/if}
  </div>
</div>

{#if message.type === 'ai' && !message.isStreaming && (message.content || message.interrupted)}
  <div class="message-actions">
    <div class="token-count">{tokenCount} tokens</div>
    <button class="action-btn" on:click={handleCopy} title="Copy">
      {#if copied}<Check size={16} />{:else}<Copy size={16} />{/if}
    </button>
    <button class="action-btn" title="Good response" disabled={isSharedView}><ThumbsUp size={16} /></button>
    <button class="action-btn" title="Bad response" disabled={isSharedView}><ThumbsDown size={16} /></button>
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
    margin-bottom: 0.5rem;
    opacity: 0;
    transform: translateY(10px);
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .message-container.mounted { opacity: 1; transform: translateY(0); }
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
  .user .message-avatar { background: var(--primary-color); color: white; }
  .message-container.ai { gap: 0; }
  .message-content { flex: 1; min-width: 0; text-align: left; }
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
  .ai-message, .code-message { font-family: 'Nunito', sans-serif; line-height: 1.6; color: var(--text-color); word-wrap: break-word; max-width: 100%; text-align: left; }
  .message-actions { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding-top: 0.5rem; }
  .interrupted-indicator { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); margin-left: auto; font-style: italic; padding: 0.25rem 0.5rem; border-radius: 6px; background-color: var(--hover-color); }
  .token-count { font-size: 0.75rem; color: var(--text-muted); margin-right: 0.5rem; }
  .action-btn { background: none; border: 1px solid var(--border-color); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); transition: all 0.2s ease; }
  .action-btn:hover:not(:disabled) { background: var(--hover-color); color: var(--text-color); border-color: var(--primary-color); }
  .action-btn:disabled { cursor: not-allowed; opacity: 0.5; }
  .ai-message :global(p), .code-message :global(p) { margin: 0 0 1rem 0; }
  .ai-message :global(p:last-child), .code-message :global(p:last-child) { margin-bottom: 0; }
  .cursor { animation: blink 1s infinite; color: var(--primary-color); font-weight: bold; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
</style>