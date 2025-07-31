<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Send, Mic, Paperclip, BrainCircuit } from 'lucide-svelte';
  import { chatStore } from '../stores/chat';
  import { settingsStore } from '../stores/settings';

  const dispatch = createEventDispatcher<{
    submit: { message: string }
  }>();

  let message = '';
  let textareaElement: HTMLTextAreaElement;
  let isRecording = false;
  let recognition: any = null;

  $: isInitialState = $chatStore.isInitialState;
  $: isLoading = $chatStore.isLoading;
  $: reasoning = $settingsStore.settings.reasoning;

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
            message += event.results[i][0].transcript;
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

  function handleSubmit() {
    if (message.trim() && !isLoading) {
      dispatch('submit', { message: message.trim() });
      message = '';
      if (textareaElement) {
        textareaElement.style.height = 'auto';
      }
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

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
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
    // This is a placeholder for the file selection logic
    alert('File selection is not yet implemented.');
  }

  function toggleReasoning() {
    settingsStore.toggleReasoning();
  }
</script>

<div class="chat-input-container" class:initial-state={isInitialState} class:chat-state={!isInitialState}>
  <div class="input-wrapper">
    <button class="icon-button" on:click={handleFileSelect} aria-label="Send file">
      <Paperclip size={20} />
    </button>
    <textarea
      bind:this={textareaElement}
      bind:value={message}
      on:keydown={handleKeydown}
      on:input={autoResize}
      on:paste={handlePaste}
      placeholder="Message Deepthinks..."
      rows="1"
      disabled={isLoading}
      class="chat-textarea"
    ></textarea>
    <button class="icon-button" on:click={toggleVoiceRecording} class:recording={isRecording} aria-label="Voice input">
      <Mic size={20} />
    </button>
    <button class="icon-button" on:click={toggleReasoning} class:active={reasoning} aria-label="Toggle reasoning">
      <BrainCircuit size={20} />
    </button>
    <button
      on:click={handleSubmit}
      disabled={!message.trim() || isLoading}
      class="send-button"
      aria-label="Send message"
    >
      <Send size={20} />
    </button>
  </div>
</div>

<style>
  .chat-input-container {
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    padding: 0 1rem;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    z-index: 50;
  }

  .chat-input-container.initial-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -40%) scale(1.1);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
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
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 0.75rem 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
  }

  .chat-textarea {
    flex-grow: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--text-color);
    max-height: 120px;
    overflow-y: auto;
    padding: 0 0.5rem;
  }

  .chat-textarea::placeholder {
    color: var(--text-muted);
  }

  .chat-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon-button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .icon-button:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }

  .icon-button.recording {
    color: var(--primary-color);
  }
  
  .icon-button.active {
    color: var(--primary-color);
  }

  .send-button {
    width: 36px;
    height: 36px;
    background: var(--primary-color);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    margin-left: 0.5rem;
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: scale(1.05);
  }

  .send-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: scale(1);
  }

  @media (max-width: 768px) {
    .chat-input-container {
      padding: 0 1rem;
    }

    .chat-input-container.chat-state {
      padding-bottom: 1rem;
    }

    .input-wrapper {
      padding: 0.6rem 0.75rem;
    }

    .chat-textarea {
      font-size: 0.9rem;
    }

    .send-button {
      width: 32px;
      height: 32px;
    }
  }
</style>