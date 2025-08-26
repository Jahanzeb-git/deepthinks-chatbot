<script lang="ts">
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { renderMath } from '../lib/katex';
  import { User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, AlertTriangle } from 'lucide-svelte';
  import type { ChatMessage, StreamingCodeMessage } from '../stores/chat';
  import { chatStore } from '../stores/chat';
  import { StreamingJsonParser, type StreamingCodeState } from '../lib/streamingJsonParser';
  import { artifactStore } from '../stores/artifact';
  import ReasoningBlock from './shared/ReasoningBlock.svelte';
  import FileCard from './shared/FileCard.svelte';

  export let messageId: string;
  export let isLastAiMessage: boolean = false;
  export let isSharedView: boolean = false;

  $: message = $chatStore.messages.find(m => m.id === messageId) as ChatMessage | StreamingCodeMessage;

  let messageElement: HTMLDivElement;
  let mounted = false;
  let copied = false;

  const dispatch = createEventDispatcher<{
    regenerate: { messageId: string }
  }>();

  type Segment = { type: 'normal' | 'thinking'; content: string; };
  type CodeBlock = {
    id: number;
    type: 'text' | 'file' | 'conclusion';
    content: string; 
    file?: { 
      fileName: string;
      fileCode: string;
      fileText: string;
    };
  };

  let segments: Segment[] = [];
  let codeBlocks: CodeBlock[] = [];
  
  $: if (message) {
    if (message.type === 'ai') {
      if (message.mode === 'code') {
        // Handle streaming code mode
        if ('streamingState' in message && message.streamingState) {
          // Use streaming state directly for progressive rendering
          const streamingState = message.streamingState;
          codeBlocks = buildCodeBlocksFromStreamingState(streamingState);
        } else {
          // Fallback to traditional parsing for complete messages
          try {
            const parsed = JSON.parse(message.content);
            const newBlocks: CodeBlock[] = [];
            let idCounter = 0;

            if (parsed.Text) {
              newBlocks.push({ id: idCounter++, type: 'text', content: parsed.Text });
            }

            if (parsed.Files && Array.isArray(parsed.Files)) {
              for (const file of parsed.Files) {
                if (file.FileName) {
                  newBlocks.push({ 
                    id: idCounter++, 
                    type: 'file', 
                    content: file.FileText || '', 
                    file: {
                      fileName: file.FileName,
                      fileCode: file.FileCode || '',
                      fileText: file.FileText || ''
                    } 
                  });
                }
              }
            }

            if (parsed.Conclusion) {
              newBlocks.push({ id: idCounter++, type: 'conclusion', content: parsed.Conclusion });
            }
            codeBlocks = newBlocks;
          } catch (e) {
            // It's an incomplete JSON string, so we don't do anything yet.
            // The final complete JSON will parse correctly and render the full content.
          }
        }
      } else {
        // Handle default and reason modes with existing logic
        const parts = message.content.split(/(<think>|<\/think>)/g);
        const newSegments: Segment[] = [];
        let inThinkingBlock = false;
        for (const part of parts) {
          if (part === '<think>') inThinkingBlock = true;
          else if (part === '</think>') inThinkingBlock = false;
          else if (part) newSegments.push({ type: inThinkingBlock ? 'thinking' : 'normal', content: part });
        }
        segments = newSegments;
      }
    }
  }

  function buildCodeBlocksFromStreamingState(state: StreamingCodeState): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let idCounter = 0;

    if (state.fieldContents.Text) {
      blocks.push({
        id: idCounter++,
        type: 'text',
        content: state.fieldContents.Text
      });
    }

    state.fieldContents.Files.forEach((file) => {
      if (file.FileName) {
        blocks.push({
          id: idCounter++,
          type: 'file',
          content: file.FileText || '',
          file: {
            fileName: file.FileName,
            fileCode: file.FileCode || '',
            fileText: file.FileText || ''
          }
        });
      }
    });

    if (state.fieldContents.Conclusion) {
      blocks.push({
        id: idCounter++,
        type: 'conclusion',
        content: state.fieldContents.Conclusion
      });
    }

    return blocks;
  }

  function openArtifact(file: any) {
    if (file) {
      artifactStore.open(file.fileName, file.fileCode, false);
    }
  }

  $: tokenCount = message?.tokenCount !== undefined
    ? message.tokenCount
    : message?.content.split(/\s+/).filter(Boolean).length;

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

{#if message}
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
          {#each codeBlocks as block (block.id)}
            {#if block.type === 'text' || block.type === 'conclusion'}
              <div class="markdown-content">{@html renderMarkdown(block.content)}</div>
            {:else if block.type === 'file' && block.file}
              <div class="file-block">
                <button class="file-card-button" on:click={() => openArtifact(block.file)}>
                  <FileCard filename={block.file.fileName} />
                </button>
                {#if block.file.fileText}
                  <div class="markdown-content file-text">{@html renderMarkdown(block.file.fileText)}</div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="ai-message" use:renderMath>
          {#each segments as segment}
            {#if segment.type === 'thinking'}
              <ReasoningBlock content={segment.content} streaming={message.isStreaming} />
            {:else if segment.content}
              {@html renderMarkdown(segment.content)}
            {/if}
          {/each}
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
{/if}

<style>
  .message-container { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; opacity: 0; transform: translateY(10px); animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  .message-container.mounted { opacity: 1; transform: translateY(0); }
  .message-avatar { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 0.25rem; }
  .user .message-avatar { background: var(--primary-color); color: white; }
  .message-container.ai { gap: 0; }
  .message-content { flex: 1; min-width: 0; text-align: left; }
  .user-message { background: var(--primary-color); color: white; padding: 0.75rem 1rem; border-radius: 18px 18px 4px 18px; font-weight: 500; word-wrap: break-word; display: inline-block; max-width: 100%; font-family: 'Nunito', sans-serif; }
  .ai-message, .code-message { font-family: 'Nunito', sans-serif; line-height: 1.6; color: var(--text-color); word-wrap: break-word; max-width: 100%; text-align: left; }
  .message-actions { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding-top: 0.5rem; }
  .interrupted-indicator { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); margin-left: auto; font-style: italic; padding: 0.25rem 0.5rem; border-radius: 6px; background-color: var(--hover-color); }
  .token-count { font-size: 0.75rem; color: var(--text-muted); margin-right: 0.5rem; }
  .action-btn { background: none; border: 1px solid var(--border-color); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); transition: all 0.2s ease; }
  .action-btn:hover:not(:disabled) { background: var(--hover-color); color: var(--text-color); border-color: var(--primary-color); }
  .action-btn:disabled { cursor: not-allowed; opacity: 0.5; }
  .ai-message :global(p), .code-message :global(p) { margin: 0 0 1rem 0; }
  .ai-message :global(p:last-child), .code-message :global(p:last-child) { margin-bottom: 0; }
  .file-block { margin: 0.5rem 0; }
  .file-card-button { background: none; border: none; padding: 0; cursor: pointer; display: block; width: 100%; text-align: left; }
  .file-text { padding: 0.5rem; margin-top: 0.5rem; background: var(--surface-color); border-radius: 8px; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>