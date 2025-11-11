<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { renderMath } from '../lib/katex';
  import { SimpleCodeParser, type ContentSegment } from '../lib/simple-code-parser';
  import { User, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, AlertTriangle, Search, FileImage, FileText, FileCode, FileAudio, FileVideo, File as FileIcon } from 'lucide-svelte';
  import type { ChatMessage } from '../stores/chat';
  import { parseUserMessage, type UserMessageSegment } from '../lib/user-message-parser';
  import { chatStore } from '../stores/chat';
  import { artifactStore } from '../stores/artifact';
  import ReasoningBlock from './shared/ReasoningBlock.svelte';
  import WebSearchUI from './shared/WebSearchUI.svelte';
  import FileCard from './shared/FileCard.svelte';
  import CodeBlock from './shared/CodeBlock.svelte';
  import { fly } from 'svelte/transition';
  import hljs from 'highlight.js';


  function enhanceContent(node: HTMLElement) {
    // Only for math rendering now - code blocks are handled separately
    return renderMath(node);
  }

  interface FileMetadata {
    id: string;
    original_name: string;
    b2_key: string;
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

  // Parser instance - persists across updates
  let parser: SimpleCodeParser | null = null;
  let segments: ContentSegment[] = [];

  $: userPromptText = (() => {
    if (message?.type !== 'user') return '';
    try {
      const parsed = JSON.parse(message.content);
      return parsed.prompt ?? message.content;
    } catch (e) {
      return message.content;
    }
  })();

  $: userMessageSegments = (() => {
    if (message?.type !== 'user') return [];
    return parseUserMessage(userPromptText);
  })();

  $: contentParts = message ? message.content.split('<--tool-call-->') : [''];

  // Parse streaming content - key fix: only parse the LAST part (actively streaming)
  $: if (message && message.type === 'ai' && message.mode !== 'code') {
    // Initialize parser on first run
    if (!parser) {
      parser = new SimpleCodeParser();
    }
    
    // Get the actively streaming part (last part after tool calls)
    const currentPart = contentParts[contentParts.length - 1];
    
    // Parse it - parser maintains state and returns SAME array reference
    segments = parser.parse(currentPart);
    
    // Reset parser when message is complete
    if (!message.isStreaming) {
      parser.reset();
    }
  }

  // Cleanup
  onDestroy(() => {
    if (parser) {
      parser.reset();
      parser = null;
    }
  });

  const dispatch = createEventDispatcher<{
    regenerate: { messageId: string }
  }>();

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
      } else if (message.mode === 'code' && !message.codeModeContent) {
        codeBlocks = [];
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

  $: codeModeToolCalls = message?.mode === 'code' && message?.toolCalls 
    ? message.toolCalls.filter(tc => tc.position)
    : [];

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
        `https://chatbot-backend-wandering-shadow-534.fly.dev/${sessionId}/${file.b2_key}`,
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
        window.open(url, '_blank');
      } else {
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

  function getFileTypeInfo(type: string, original_name: string) {
    const ext = original_name.toLowerCase().split('.').pop() || '';
    
    if (type.startsWith('image/')) {
      return { Component: FileImage, color: '#10b981' };
    }
    
    if (type.startsWith('audio/')) {
      return { Component: FileAudio, color: '#8b5cf6' };
    }
    
    if (type.startsWith('video/')) {
      return { Component: FileVideo, color: '#f59e0b' };
    }
    
    // Programming files
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sh', 'bash', 'sql', 'json', 'yaml', 'yml', 'toml', 'lock', 'html', 'css'];
    if (codeExts.includes(ext)) {
      return { Component: FileCode, color: '#3b82f6' };
    }
    
    // Document files
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'odp', 'ods'];
    if (docExts.includes(ext)) {
      return { Component: FileText, color: '#8b5cf6' };
    }
    
    // Text files
    const textExts = ['txt', 'md', 'csv', 'log', 'xml'];
    if (textExts.includes(ext)) {
      return { Component: FileText, color: '#6b7280' };
    }
    
    // Default
    return { Component: FileIcon, color: '#6b7280' };
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
      {#if fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0}
        <div class="file-attachments">
          {#each fileAttachments as file}
            {@const fileInfo = getFileTypeInfo(file.type, file.original_name)}
            <button 
              class="file-attachment-btn"
              on:click={() => handleFileClick(file)}
            >
              <div class="file-att-content">
                <div class="file-att-icon" style="color: {fileInfo.color};">
                  <svelte:component this={fileInfo.Component} size={20} />
                </div>
                <div class="file-att-info">
                  <span class="file-att-name">{file.original_name}</span>
                  <span class="file-att-size">{formatBytes(file.size)}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      
      <div class="user-message">
        {#each userMessageSegments as segment}
          {#if segment.type === 'text'}
            <pre class="user-message-text">{segment.content}</pre>
          {:else if segment.type === 'code'}
            <div class="user-code-block">
              <div class="user-code-language">{segment.language}</div>
              <pre class="user-code-content"><code class="hljs language-{segment.language}">{@html hljs.highlight(segment.content, { language: segment.language, ignoreIllegals: true }).value}</code></pre>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {:else}
    <div class="message-content">
      {#if message.mode === 'code'}
        <div class="code-message" use:enhanceContent>
          {#each codeBlocks as block, blockIdx (block.id)}
            {#if block.type === 'text'}
              <div class="markdown-content">{@html renderMarkdown(block.content)}</div>
        
              {#each codeModeToolCalls.filter(tc => tc.position === 'after_text') as toolCall}
                <WebSearchUI 
                  query={toolCall.query}
                  urls={toolCall.urls || []}
                  isLoading={false}
                />
              {/each}
        
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
          
                {#each codeModeToolCalls.filter(tc => tc.position === 'after_file' && tc.fileIndex === blockIdx - 1) as toolCall}
                  <WebSearchUI 
                    query={toolCall.query}
                    urls={toolCall.urls || []}
                    isLoading={false}
                  />
                {/each}
              </div>
        
            {:else if block.type === 'conclusion'}
              {#each codeModeToolCalls.filter(tc => tc.position === 'before_conclusion') as toolCall}
                <WebSearchUI 
                  query={toolCall.query}
                  urls={toolCall.urls || []}
                  isLoading={false}
                />
              {/each}
        
              <div class="markdown-content">{@html renderMarkdown(block.content)}</div>
            {/if}
          {/each}
        </div>
      {:else}
        <!-- DEFAULT MODE: Segment-based rendering with stable CodeBlock components -->
        <div class="ai-message" use:enhanceContent>
          {#each contentParts as part, partIdx}
            {#if partIdx < contentParts.length - 1}
              <!-- Completed parts before tool calls - use standard markdown -->
              {@html renderMarkdown(part)}
              
              {#if message.toolCalls && message.toolCalls[partIdx]}
                <WebSearchUI 
                  query={message.toolCalls[partIdx].query}
                  urls={message.toolCalls[partIdx].urls || []}
                  isLoading={message.toolCalls[partIdx].isLoading ?? true}
                />
              {/if}
            {:else}
              <!-- Current streaming part - use segment-based rendering -->
              {#each segments as segment (segment.id)}
                {#if segment.type === 'text'}
                  {@html renderMarkdown(segment.content)}
                {:else if segment.type === 'code'}
                  <CodeBlock 
                    code={segment.content} 
                    language={segment.language || ''} 
                    inline={false}
                  />
                {:else if segment.type === 'inline-code'}<CodeBlock code={segment.content} language="" inline={true} />{/if}
              {/each}
              
              {#if message.toolCalls && message.toolCalls[partIdx]}
                <WebSearchUI 
                  query={message.toolCalls[partIdx].query}
                  urls={message.toolCalls[partIdx].urls || []}
                  isLoading={message.toolCalls[partIdx].isLoading ?? true}
                />  
              {/if}
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if message.type === 'ai' && !message.isStreaming && (message.content || message.interrupted)}
  <div class="actions-and-disclaimer">
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
    {#if isLastAiMessage}
      <div class="disclaimer-text" transition:fly="{{ y: 10, duration: 500 }}">
        Please verify important info.
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
  .actions-and-disclaimer { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; margin-bottom: 1.5rem; padding-top: 0.5rem; }
  .message-actions { display: flex; align-items: center; gap: 0.5rem; }
  .interrupted-indicator { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); margin-left: auto; font-style: italic; padding: 0.25rem 0.5rem; border-radius: 6px; background-color: var(--hover-color); }
  .disclaimer-text { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
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
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .file-attachment-btn {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 0.5rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 90px;
    height: 90px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .file-attachment-btn:hover {
    border-color: var(--primary-color);
    background: var(--hover-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .file-att-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    width: 100%;
  }

  .file-att-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(107, 114, 128, 0.05);
    flex-shrink: 0;
  }
  
  .file-att-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    min-width: 0;
    width: 100%;
  }

  .file-att-name {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .file-att-size {
    font-size: 0.6rem;
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

  .ai-message :global(p) {
    display: inline;
    margin: 0;
  }

  .ai-message :global(p:has(+ p)) {
    display: block;
    margin-bottom: 1rem;
  }

  .user-code-block {
    margin: 0.75rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--hover-color);
  }

  .user-code-language {
    padding: 0.5rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    letter-spacing: 0.05em;
    font-family: 'Courier New', monospace;
  }

  .user-code-content {
    margin: 0;
    padding: 0.75rem;
    overflow-x: auto;
    background: transparent;
  }

  .user-code-content code {
    font-family: 'Courier New', Consolas, Monaco, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-color);
  }

  .user-code-content::-webkit-scrollbar {
    height: 6px;
  }

  .user-code-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .user-code-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  .user-message-text {
    margin: 0;
    font-family: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .user-message-text + .user-code-block,
  .user-code-block + .user-message-text,
  .user-code-block + .user-code-block {
    margin-top: 0.5rem;
  }

  .user-code-block {
    background: transparent !important;  /* remove mismatched container background */
    padding: 0 !important;               /* avoid extra gray padding */
  }

  .user-code {
    background: var(--surface-color) !important;  /* make code block match bubble */
  }
</style>