<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { renderMath } from '../lib/katex';
  import { User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, AlertTriangle } from 'lucide-svelte';
  import type { ChatMessage } from '../stores/chat';
  import { chatStore } from '../stores/chat';
  import { artifactStore } from '../stores/artifact';
  import ReasoningBlock from './shared/ReasoningBlock.svelte';
  import FileCard from './shared/FileCard.svelte';

  interface FileMetadata {
    id: string;
    original_name: string;
    stored_name: string;
    size: number;
    type: string;
    uploaded_at: string;
    is_image: boolean;
  }

  export let messageId: string;
  export let isLastAiMessage: boolean = false;
  export let isSharedView: boolean = false;

  $: message = $chatStore.messages.find(m => m.id === messageId);
  $: activeFileKey = $artifactStore.activeFileKey;
  $: fileAttachments = (message?.type === 'user' && message.content) 
    ? (() => {
        try {
          const parsed = JSON.parse(message.content);
          return parsed.files || null;
        } catch {
          return null;
        }
      })()
    : null;

  let messageElement: HTMLDivElement;
  let mounted = false;
  let copied = false;

  $: userPromptText = (() => {
    if (message?.type !== 'user') return '';
    try {
      const parsed = JSON.parse(message.content);
      return parsed.prompt ?? message.content;
    } catch (e) {
      return message.content;
    }
  })();

  $: fileAttachments = (message?.type === 'user' && message.content) 
  ? (() => {
      try {
        const parsed = JSON.parse(message.content);
        return parsed.files || null;
      } catch {
        return null;
      }
    })()
  : null;

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
      fileVersion?: number;
      fileCode: string;
      fileText: string;
    };
  };

  let segments: Segment[] = [];
  let codeBlocks: CodeBlock[] = [];
  
  $: if (message) {
    if (message.type === 'ai') {
      if (message.mode === 'code' && message.codeModeContent) {
        const newBlocks: CodeBlock[] = [];
        let idCounter = 0;
        const content = message.codeModeContent;

        if (content.Text) {
          newBlocks.push({ id: idCounter++, type: 'text', content: content.Text });
        }
        if (content.Files && Array.isArray(content.Files)) {
          for (const file of content.Files) {
            if (file.FileName || file.FileCode || file.FileText) {
              newBlocks.push({
                id: idCounter++,
                type: 'file',
                content: file.FileText || '',
                file: {
                  fileName: file.FileName || '',
                  fileVersion: file.FileVersion, 
                  fileCode: file.FileCode || '',
                  fileText: file.FileText || ''
                }
              });
            }
          }
        }
        if (content.Conclusion) {
          newBlocks.push({ id: idCounter++, type: 'conclusion', content: content.Conclusion });
        }
        codeBlocks = newBlocks;
      } else if (message.mode !== 'code') {
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

  function openArtifact(file: any) {
    if (file) {
      artifactStore.open(file.fileName, file.fileCode, false, file.fileVersion);
    }
  }

  $: tokenCount = message?.tokenCount !== undefined
    ? message.tokenCount
    : message?.content.split(/\s+/).filter(Boolean).length;

  function handleCopy() {
    const contentToCopy = message.mode === 'code' && message.codeModeContent 
      ? JSON.stringify(message.codeModeContent, null, 2) 
      : message.content;
    navigator.clipboard.writeText(contentToCopy);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function handleRegenerate() {
    dispatch('regenerate', { messageId: message.id });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  async function handleFileClick(file: FileMetadata) {
    const token = localStorage.getItem('deepthinks_token');
    const sessions = JSON.parse(localStorage.getItem('deepthinks_sessions') || '[]');
    const sessionId = sessions[0] || '';

    if (!token || !sessionId) {
      alert('Authentication required');
      return;
    }

    try {
      const response = await fetch(
        `https://jahanzebahmed25.pythonanywhere.com/files/${sessionId}/${file.stored_name}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (file.is_image || file.type.includes('pdf')) {
        // Open in new tab
        window.open(url, '_blank');
      } else {
        // Download file
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('File access error:', error);
      alert('Failed to access file');
    }
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
    <div class="message-content">
      <!-- File attachments above message -->
      {#if fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0}
        <div class="file-attachments">
          {#each fileAttachments as file}
            <button 
              class="file-attachment-btn"
              on:click={() => handleFileClick(file)}
            >
              <div class="file-att-icon">
                {#if file.is_image}
                  🖼️
                {:else if file.type.includes('pdf')}
                  📄
                {:else if file.type.includes('word') || file.type.includes('document')}
                  📝
                {:else if file.type.includes('sheet') || file.type.includes('csv')}
                  📊
                {:else}
                  📎
                {/if}
              </div>
              <div class="file-att-info">
                <span class="file-att-name">{file.original_name}</span>
                <span class="file-att-size">{formatBytes(file.size)}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      
      <div class="user-message">
        <pre class="user-message-text">{userPromptText}</pre>
      </div>
    </div>
  {:else} <!-- This is for message.type === 'ai' -->
    <div class="message-content">
      {#if message.mode === 'code'}
        <div class="code-message" use:renderMath>
          {#each codeBlocks as block (block.id)}
            {#if block.type === 'text' || block.type === 'conclusion'}
              <div class="markdown-content">{@html renderMarkdown(block.content)}</div>
            {:else if block.type === 'file' && block.file}
              <div class="file-block">
                {#if block.file && block.file.fileName}
                  <button class="file-card-button" on:click={() => openArtifact(block.file)}>
                    <FileCard 
                      filename={block.file.fileName}
                      version={block.file.fileVersion}
                      isActive={activeFileKey === `${block.file.fileName}_v${block.file.fileVersion || 'undefined'}`}
                    />
                  </button>
                {/if}
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
    </div>
  {/if}
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
  .user-message { background: var(--surface-color); color: var(--text-color); padding: 0.75rem 1rem; border-radius: 18px 18px 4px 18px; font-weight: 500; word-wrap: break-word; display: inline-block; max-width: 100%; font-family: 'Nunito', sans-serif; }
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

  .file-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .file-attachment-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    max-width: 200px;
  }
  .file-attachment-btn:hover {
    border-color: var(--primary-color);
    background: var(--hover-color);
    transform: translateY(-1px);
  }

  .file-att-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  .file-att-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .file-att-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .file-att-size {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .user-message-text {
    margin: 0;
    font-family: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .ai-message :global(hr),
  .code-message :global(hr),
  .markdown-content :global(hr),
  .user-message :global(hr) {
    border: none;
    border-top: 1px solid var(--divider, rgba(0,0,0,0.08));
    height: 1px;
    margin: 0.9rem 0;
    pointer-events: none;
  }
</style>