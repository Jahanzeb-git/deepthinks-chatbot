<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ArrowUp, Mic, Upload, BrainCircuit, Square } from 'lucide-svelte';
  import { chatStore } from '../stores/chat';
  import { settingsStore } from '../stores/settings';
  import { authStore } from '../stores/auth';
  import { fileStore } from '../stores/file';
  import Tooltip from './shared/Tooltip.svelte';
  import FileUploader from './FileUploader.svelte';

  const dispatch = createEventDispatcher<{
    submit: { message: string };
    interrupt: void;
  }>();

  let message = '';
  let textareaElement: HTMLTextAreaElement;
  let isRecording = false;
  let recognition: any = null;
  let showFileUploader = false;

  $: isInitialState = $chatStore.isInitialState;
  $: isLoading = $chatStore.isLoading;
  $: isStreaming = $chatStore.isStreaming;
  $: reasoning = $settingsStore.settings.reasoning;
  $: isAuthenticated = $authStore.isAuthenticated;
  $: fileStatus = $fileStore.status;

  // Text persistence functionality
  const DRAFT_KEY = 'deepthinks_draft_message';

  onMount(() => {
    // Load persisted draft message
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      message = savedDraft;
      // Auto-resize textarea if needed
      setTimeout(() => {
        if (textareaElement) {
          autoResize();
        }
      }, 0);
    }

    // Speech recognition setup
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            message += event.results[i][0].transcript;
            saveDraft();
          } else {
            interim_transcript += event.results[i][0].transcript;
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

  function saveDraft() {
    if (message.trim()) {
      localStorage.setItem(DRAFT_KEY, message);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function handleSubmit() {
    if (message.trim() && !isStreaming) {
      dispatch('submit', { message: message.trim() });
      message = '';
      clearDraft();
      if (textareaElement) {
        textareaElement.style.height = 'auto';
      }
      fileStore.clearFile();
      showFileUploader = false;
    }
  }

  function handleButtonClick() {
    if (isStreaming) {
      dispatch('interrupt');
    } else {
      handleSubmit();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function autoResize() {
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = textareaElement.scrollHeight + 'px';
    }
  }

  function handleInput() {
    autoResize();
    saveDraft();
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      setTimeout(saveDraft, 0);
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

  function toggleReasoning() {
    settingsStore.toggleReasoning();
  }
</script>

<div class="chat-input-container" class:initial-state={isInitialState} class:chat-state={!isInitialState}>
  {#if showFileUploader}
    <FileUploader />
  {/if}
  <div class="input-wrapper">
    <textarea
      bind:this={textareaElement}
      bind:value={message}
      on:keydown={handleKeydown}
      on:input={handleInput}
      on:paste={handlePaste}
      placeholder="Message Deepthinks..."
      rows="1"
      disabled={isStreaming}
      class="chat-textarea"
    ></textarea>
    
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
        <Tooltip text="Log in to use this feature." position="top" enabled={!isAuthenticated}>
          <button 
            class="reasoning-toggle" 
            class:active={reasoning} 
            on:click={toggleReasoning} 
            aria-label="Toggle reasoning"
            disabled={!isAuthenticated}
          >
            <BrainCircuit size={16} />
            <span class="reasoning-text">Reasoning</span>
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
            disabled={!isAuthenticated}
          >
            <Upload size={18} />
          </button>
        </Tooltip>
      </div>
      
      <button
        on:click={handleButtonClick}
        disabled={!message.trim() && !isStreaming}
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

<style>
  .chat-input-container {
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    padding: 0 1rem;
    transition: transform 0.3s ease, opacity 0.3s ease;
    z-index: 50;
  }

  .chat-input-container.initial-state {
    /* This is now handled by the parent container in App.svelte */
  }

  .chat-input-container.chat-state {
    padding-bottom: 2rem;
    position: relative;
    top: auto;
    left: auto;
    transform: none;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 24px;
    padding: 12px 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    gap: 8px;
  }

  .input-wrapper:focus-within {
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  }

  .chat-textarea {
    flex-grow: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-color, #1f2937);
    max-height: 120px;
    min-height: 20px;
    overflow-y: auto;
    padding: 0;
  }

  .chat-textarea::placeholder {
    color: var(--text-muted, #9ca3af);
  }

  .chat-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .controls-container {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-button {
    background: transparent;
    border: none;
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: color 0.15s ease, background-color 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover {
    background: var(--hover-color, #f3f4f6);
    color: var(--text-color, #374151);
  }

  .mic-button.recording {
    color: var(--error-color, #ef4444);
    background: rgba(239, 68, 68, 0.08);
  }

  .file-button.active {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .reasoning-toggle {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 12px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .reasoning-toggle:hover {
    background: var(--hover-color, #f9fafb);
    border-color: var(--primary-color, #3b82f6);
    color: var(--primary-color, #3b82f6);
  }

  .reasoning-toggle.active {
    background: var(--primary-color, #3b82f6);
    border-color: var(--primary-color, #3b82f6);
    color: white;
  }

  @media (max-width: 480px) {
    .reasoning-toggle {
      background-color: var(--hover-color);
    }
  }

  .reasoning-text {
    font-family: inherit;
    letter-spacing: -0.01em;
  }

  .send-button {
    width: 32px;
    height: 32px;
    background: var(--primary-color, #3b82f6);
    border: none;
    border-radius: 16px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, transform 0.1s ease;
    padding: 0;
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }

  .send-button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .send-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tooltip-wrapper {
    position: relative;
  }

  /* Minimal scrollbar styling */
  .chat-textarea::-webkit-scrollbar {
    width: 3px;
  }

  .chat-textarea::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-textarea::-webkit-scrollbar-thumb {
    background: var(--border-color, #e2e8f0);
    border-radius: 2px;
  }

  /* Mobile optimizations */
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

    .reasoning-toggle {
      padding: 5px 8px;
      font-size: 12px;
      gap: 5px;
    }

    .icon-button {
      padding: 6px;
    }

    .controls-container {
      gap: 3px;
    }
  }

  @media (max-width: 480px) {
    .reasoning-text {
      display: none;
    }
    
    .reasoning-toggle {
      padding: 6px;
      min-width: auto;
    }

    .chat-input-container.initial-state {
      /* transform: translate(-50%, -40%) scale(1.02); */
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .input-wrapper {
      border-width: 2px;
    }
    
    .reasoning-toggle {
      border-width: 2px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
</style>