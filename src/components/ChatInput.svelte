<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ArrowUp, Mic, Upload, Square, Code, X, Edit2 } from 'lucide-svelte';
  import { chatStore, isCodingMode } from '../stores/chat';
  import { authStore } from '../stores/auth';
  import { fileStore } from '../stores/file';
  import { api } from '../lib/api';
  import Tooltip from './shared/Tooltip.svelte';
  import FileUploader from './FileUploader.svelte';

  export let disabled = false;

  const dispatch = createEventDispatcher<{
    submit: { message: string; reason: 'default' | 'reason' | 'code' };
    interrupt: void;
  }>();

  // ==================== STATE ====================
  interface ContentBlock {
    id: string;
    type: 'text' | 'code';
    content: string;
    language?: string;
  }

  let blocks: ContentBlock[] = [{ id: '1', type: 'text', content: '' }];
  let activeBlockId = '1';
  let editingCodeId: string | null = null;
  let contentArea: HTMLDivElement;
  let isRecording = false;
  let recognition: any = null;
  let showFileUploader = false;

  $: isInitialState = $chatStore.isInitialState;
  $: isLoading = $chatStore.isLoading;
  $: isStreaming = $chatStore.isStreaming;
  $: codingMode = $isCodingMode;
  $: isAuthenticated = $authStore.isAuthenticated;
  $: fileStatus = $fileStore.status;

  // ==================== CODE DETECTION HEURISTIC ====================
  function isCode(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Single line code detection
    if (lineCount === 1) {
      const line = text.trim();
      const singleLinePatterns = [
        /^(const|let|var|function|class|def|import|export|return)\s+/,
        /^(if|for|while|switch)\s*\(/,
        /[{}\[\]()];?\s*$/,
        /<[^>]+>.*<\/[^>]+>/,
        /=>\s*{/,
        /^\s*\/\/.+/,
        /^\s*#.+/,
      ];
      
      if (singleLinePatterns.some(pattern => pattern.test(line))) return true;
    }
    
    // Multi-line code detection
    if (lineCount > 1) {
      let indentedLines = 0;
      let symbolDensity = 0;
      let totalChars = 0;
      let hasKeywords = false;
      
      const keywords = [
        'function', 'const', 'let', 'var', 'class', 'def', 'import', 'export',
        'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
        'continue', 'try', 'catch', 'throw', 'async', 'await', 'public',
        'private', 'protected', 'static', 'void', 'int', 'string', 'bool'
      ];
      
      lines.forEach(line => {
        if (/^\s{2,}/.test(line)) indentedLines++;
        
        const symbols = line.match(/[{}\[\]()<>;:=+\-*/%&|!]/g);
        if (symbols) symbolDensity += symbols.length;
        
        totalChars += line.length;
        
        if (keywords.some(kw => new RegExp(`\\b${kw}\\b`).test(line))) {
          hasKeywords = true;
        }
      });
      
      const indentRatio = indentedLines / lineCount;
      const symbolRatio = symbolDensity / Math.max(totalChars, 1);
      
      if (indentRatio > 0.3 && symbolRatio > 0.05) return true;
      if (hasKeywords && (indentRatio > 0.2 || symbolRatio > 0.08)) return true;
      if (lineCount > 3 && indentRatio > 0.4) return true;
    }
    
    return false;
  }

  // ==================== LANGUAGE DETECTION ====================
  function detectLanguage(code: string): string {
    if (/^(import|export|const|let|var|function|class)\s/.test(code.trim())) {
      if (/<[^>]+>/.test(code)) return 'jsx';
      return 'javascript';
    }
    if (/^(def|import|class|if|for|while)\s/.test(code.trim())) return 'python';
    if (/^(public|private|class|void|int|String)\s/.test(code.trim())) return 'java';
    if (/<[^>]+>.*<\/[^>]+>/.test(code)) return 'html';
    if (/\{[^}]*:[^}]*\}/.test(code)) return 'css';
    
    return 'plaintext';
  }

  // ==================== MARKDOWN PARSER ====================
  function parseMarkdown(text: string): string {
    let result = text;
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
    result = result.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+?)_/g, '<em>$1</em>');
    result = result.replace(/`(.+?)`/g, '<code class="inline-md-code">$1</code>');
    return result;
  }

  // ==================== SYNTAX HIGHLIGHTING ====================
  function highlightCode(code: string, language: string): string {
    const keywords: Record<string, string[]> = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'async', 'await'],
      python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'with'],
      java: ['public', 'private', 'class', 'void', 'int', 'String', 'return', 'if', 'else', 'for', 'while', 'new', 'this'],
    };
    
    const langKeywords = keywords[language] || [];
    let highlighted = code;
    
    // Escape HTML first
    highlighted = highlighted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Highlight strings
    highlighted = highlighted.replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, '<span class="hl-string">$&</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/\/\/.*/g, '<span class="hl-comment">$&</span>');
    highlighted = highlighted.replace(/#.*/g, '<span class="hl-comment">$&</span>');
    
    // Highlight keywords
    langKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="hl-keyword">${keyword}</span>`);
    });
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b\d+\b/g, '<span class="hl-number">$&</span>');
    
    return highlighted;
  }

  // ==================== HANDLE PASTE ====================
  function handlePaste(e: ClipboardEvent, blockId: string) {
    e.preventDefault();
    
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    
    if (isCode(text)) {
      const language = detectLanguage(text);
      const newCodeBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'code',
        content: text,
        language
      };
      
      const activeIndex = blocks.findIndex(b => b.id === blockId);
      const newBlocks = [...blocks];
      
      newBlocks.splice(activeIndex + 1, 0, newCodeBlock);
      
      const newTextBlock: ContentBlock = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: ''
      };
      newBlocks.splice(activeIndex + 2, 0, newTextBlock);
      
      blocks = newBlocks;
      activeBlockId = newTextBlock.id;
      
      setTimeout(() => {
        const textElement = document.querySelector(`[data-block-id="${newTextBlock.id}"]`) as HTMLElement;
        if (textElement) textElement.focus();
      }, 0);
    } else {
      document.execCommand('insertText', false, text);
    }
  }

  // ==================== HANDLE INPUT ====================
  function handleInput(blockId: string, e: Event) {
    const target = e.currentTarget as HTMLDivElement;
    const content = target.textContent || '';
    blocks = blocks.map(block => 
      block.id === blockId ? { ...block, content } : block
    );
  }

  // ==================== HANDLE KEY DOWN ====================
  function handleKeyDown(blockId: string, e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId);
      if (block && block.type === 'text' && block.content === '') {
        const index = blocks.findIndex(b => b.id === blockId);
        if (index > 0) {
          e.preventDefault();
          const newBlocks = blocks.filter(b => b.id !== blockId);
          blocks = newBlocks;
          activeBlockId = newBlocks[index - 1].id;
          
          setTimeout(() => {
            const prevElement = document.querySelector(`[data-block-id="${newBlocks[index - 1].id}"]`) as HTMLElement;
            if (prevElement) prevElement.focus();
          }, 0);
        }
      }
    }
  }

  // ==================== CODE BLOCK ACTIONS ====================
  function removeCodeBlock(id: string) {
    blocks = blocks.filter(block => block.id !== id);
  }

  function editCodeBlock(id: string) {
    editingCodeId = editingCodeId === id ? null : id;
  }

  function updateCodeBlock(id: string, newContent: string) {
    blocks = blocks.map(block =>
      block.id === id ? { ...block, content: newContent } : block
    );
  }

  // ==================== SUBMIT ====================
  async function handleSubmit() {
    const hasContent = blocks.some(b => b.content.trim() !== '');
    if (!hasContent || isStreaming || disabled) return;

    // Upload files if any
    if ($fileStore.files.length > 0) {
      const token = localStorage.getItem('deepthinks_token');
      const sessions = JSON.parse(localStorage.getItem('deepthinks_sessions') || '[]');
      const sessionId = sessions[0] || '';

      if (!token || !sessionId) {
        alert('Please log in to upload files.');
        return;
      }

      try {
        fileStore.setUploadStatus('uploading');
      
        const filesToUpload = $fileStore.files.map(f => f.file);
        const response = await api.uploadFile(filesToUpload, sessionId, token);
      
        if (response.error) {
          const errorMsg = response.message || response.error;
          fileStore.setUploadStatus('error', errorMsg);
          if (errorMsg.includes('limit') || errorMsg.includes('30 files')) {
            alert('Upload limit reached: You can upload a maximum of 30 files per account.');
          }
          return;
        }

        if (response.files && Array.isArray(response.files)) {
          response.files.forEach((uploadedFile: any, index: number) => {
            fileStore.updateFileAfterUpload(index, uploadedFile.b2_key);
          });
        }

        fileStore.setUploadStatus('success');
      } catch (error: any) {
        fileStore.setUploadStatus('error', error.message || 'Upload failed');
        return;
      }
    }

    // Combine all blocks into message
    let message = '';
    blocks.forEach(block => {
      if (block.type === 'text') {
        message += block.content;
      } else if (block.type === 'code') {
        message += '\n```' + (block.language || '') + '\n' + block.content + '\n```\n';
      }
    });

    const reason = codingMode ? 'code' : 'default';
    dispatch('submit', { message: message.trim(), reason });
    
    // Clear input
    blocks = [{ id: Date.now().toString(), type: 'text', content: '' }];
    activeBlockId = blocks[0].id;
    showFileUploader = false;

    if ($fileStore.files.length > 0) {
      fileStore.clearFiles();
    }
  }

  function toggleVoiceRecording() {
    if (isRecording) {
      recognition.stop();
      isRecording = false;
    } else {
      if (recognition) {
        recognition.start();
        isRecording = true;
      } else {
        alert('Speech recognition is not supported in your browser.');
      }
    }
  }

  function handleFileSelect() {
    showFileUploader = !showFileUploader;
  }

  function toggleCodingMode() {
    isCodingMode.update(v => !v);
  }

  onMount(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const lastTextBlock = blocks.filter(b => b.type === 'text').pop();
            if (lastTextBlock) {
              blocks = blocks.map(b => 
                b.id === lastTextBlock.id 
                  ? { ...b, content: b.content + event.results[i][0].transcript }
                  : b
              );
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        isRecording = false;
      };

      recognition.onend = () => {
        isRecording = false;
      };
    }
  });
</script>

<fieldset {disabled} class="chat-input-fieldset">
  <div class="chat-input-container" class:initial-state={isInitialState} class:chat-state={!isInitialState}>
    {#if showFileUploader}
      <FileUploader />
    {/if}
    <div class="input-wrapper" class:has-content={!isInitialState}>
      <div class="content-area" bind:this={contentArea}>
        {#each blocks as block, index (block.id)}
          <div class="block-wrapper">
            {#if block.type === 'text'}
              <div
                data-block-id={block.id}
                contenteditable="true"
                class="text-block"
                on:paste={(e) => handlePaste(e, block.id)}
                on:input={(e) => handleInput(block.id, e)}
                on:keydown={(e) => handleKeyDown(block.id, e)}
                on:focus={() => activeBlockId = block.id}
                placeholder={index === 0 && blocks.length === 1 && !block.content ? "Message Deepthinks..." : ""}
              >{block.content}</div>
            {:else}
              <div class="code-block">
                <div class="code-header">
                  <div class="code-controls">
                    <button
                      class="code-btn"
                      on:click={() => editCodeBlock(block.id)}
                      title="Edit code"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      class="code-btn"
                      on:click={() => removeCodeBlock(block.id)}
                      title="Remove code"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {#if editingCodeId === block.id}
                  <textarea
                    class="code-editor"
                    value={block.content}
                    on:input={(e) => updateCodeBlock(block.id, e.currentTarget.value)}
                    on:blur={() => editingCodeId = null}
                  ></textarea>
                {:else}
                  <pre class="code-content"><code class="language-{block.language || 'plaintext'}">{@html highlightCode(block.content, block.language || 'plaintext')}</code></pre>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="controls-container">
        <button 
          class="icon-button mic-button" 
          class:recording={isRecording} 
          on:click={toggleVoiceRecording} 
          aria-label="Voice input"
        >
          <Mic size={18} />
        </button>

        <div class="tooltip-wrapper">
          <Tooltip text="Enable DeepCode Mode" position="top" enabled={!isAuthenticated}>
            <button 
              class="icon-button" 
              class:active={codingMode} 
              on:click={toggleCodingMode} 
              aria-label="Toggle DeepCode Mode"
              disabled={!isAuthenticated || disabled}
            >
              <Code size={16} />
            </button>
          </Tooltip>
        </div>
        
        <div class="tooltip-wrapper">
          <Tooltip text="Log in to use this feature." position="top" enabled={!isAuthenticated}>
            <button 
              class="icon-button file-button" 
              class:active={showFileUploader}
              on:click={handleFileSelect} 
              aria-label="Upload file"
              disabled={!isAuthenticated || disabled}
            >
              <Upload size={18} />
            </button>
          </Tooltip>
        </div>
        
        <button
          on:click={handleSubmit}
          disabled={(!blocks.some(b => b.content.trim() !== '') && !isStreaming) || disabled}
          class="send-button"
          aria-label={isStreaming ? 'Stop generation' : 'Send message'}
        >
          {#if isStreaming}
            <Square size={16} />
          {:else}
            <ArrowUp size={16} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</fieldset>

<style>
  .chat-input-fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }
  .chat-input-fieldset:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .chat-input-container {
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    padding: 0 1rem;
    transition: transform 0.3s ease, opacity 0.3s ease;
    z-index: 50;
  }

  .chat-input-container.initial-state {
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .chat-input-container.chat-state {
    padding-bottom: 2rem;
    position: relative;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--chat-input-bg, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 24px;
    padding: 12px 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    gap: 8px;
  }

  .chat-input-container.initial-state .input-wrapper {
    min-height: 100px;
  }

  .content-area {
    flex: 1;
    min-height: 24px;
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 8px;
  }

  .content-area::-webkit-scrollbar {
    width: 6px;
  }

  .content-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .content-area::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  .block-wrapper {
    margin-bottom: 8px;
  }

  .block-wrapper:last-child {
    margin-bottom: 0;
  }

  .text-block:focus {
     outline: none;
     border: none;
   }

  .text-block {
    outline: none;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-color);
    min-height: 24px;
    word-wrap: break-word;
    white-space: pre-wrap;
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .text-block:empty:before {
    content: attr(placeholder);
    color: var(--text-muted);
    pointer-events: none;
  }

  .text-block :global(strong) {
    font-weight: 600;
  }

  .text-block :global(em) {
    font-style: italic;
  }

  .text-block :global(.inline-md-code) {
    background: var(--hover-color);
    color: var(--primary-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .code-block {
    background: var(--hover-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .code-header {
    display: flex;
    justify-content: flex-end;
    padding: 8px 12px;
    background: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
  }

  .code-controls {
    display: flex;
    gap: 6px;
  }

  .code-btn {
    background: var(--background-color);
    border: 1px solid var(--border-color);
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .code-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }

  .code-content {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    font-family: 'Courier New', Consolas, Monaco, monospace;
    font-size: 14px;
    line-height: 1.6;
  }

  .code-content code {
    color: var(--text-color);
  }

  .code-editor {
    width: 100%;
    padding: 16px;
    border: none;
    font-family: 'Courier New', Consolas, Monaco, monospace;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    min-height: 100px;
    background: var(--background-color);
    color: var(--text-color);
  }

  .code-editor:focus {
    outline: none;
  }

  .code-content :global(.hl-keyword) { color: #d73a49; font-weight: 600; }
  .code-content :global(.hl-string) { color: #22863a; }
  .code-content :global(.hl-comment) { color: #6a737d; font-style: italic; }
  .code-content :global(.hl-number) { color: #005cc5; }

  :global([data-theme="dark"]) .code-content :global(.hl-keyword) { color: #ff7b72; }
  :global([data-theme="dark"]) .code-content :global(.hl-string) { color: #a5d6ff; }
  :global([data-theme="dark"]) .code-content :global(.hl-comment) { color: #8b949e; }
  :global([data-theme="dark"]) .code-content :global(.hl-number) { color: #79c0ff; }

  .controls-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .input-wrapper.has-content .controls-container {
    align-self: flex-end;
  }

  .icon-button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: color 0.15s ease, background-color 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }

  .mic-button.recording {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }

  .file-button.active,
  .icon-button.active {
    background: var(--primary-color);
    color: white;
  }

  .send-button {
    width: 32px;
    height: 32px;
    background: #2C2520; /* Dark burned brownish */
    border: none;
    border-radius: 16px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, transform 0.1s ease;
    padding: 0;
    flex-shrink: 0;
  }

  .send-button:hover:not(:disabled) {
    background: #3E352F;
  }

  .send-button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .send-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  :global([data-theme="dark"]) .send-button {
    background: #E6E4E0;
    color: #1C1B1A;
  }

  :global([data-theme="dark"]) .send-button:hover:not(:disabled) {
    background: #D1D1CF;
  }

  .tooltip-wrapper {
    position: relative;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .chat-input-container {
      padding: 0 12px;
    }

    .chat-input-container.chat-state {
      padding-bottom: 16px;
    }

    .input-wrapper {
      padding: 10px 12px;
      gap: 6px;
    }

    .send-button {
      width: 30px;
      height: 30px;
      border-radius: 15px;
    }

    .icon-button {
      padding: 6px;
    }

    .controls-container {
      gap: 3px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
</style>
