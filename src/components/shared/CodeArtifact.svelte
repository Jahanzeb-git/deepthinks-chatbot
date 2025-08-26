<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X } from 'lucide-svelte';
  import { isSidebarExpanded } from '../../stores/sidebar';
  import hljs from 'highlight.js/lib/core';
  import javascript from 'highlight.js/lib/languages/javascript';
  import python from 'highlight.js/lib/languages/python';
  import typescript from 'highlight.js/lib/languages/typescript';
  import css from 'highlight.js/lib/languages/css';
  import xml from 'highlight.js/lib/languages/xml'; // For HTML
  import 'highlight.js/styles/github-dark.css';

  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('html', xml);

  export let filename: string = '';
  export let code: string = '';
  export let show: boolean = false;
  export let isStreaming: boolean = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  $: highlightedCode = (() => {
    if (!code) return '';
    const lang = filename.split('.').pop() || '';
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    // Fallback for plaintext or unknown languages
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  })();

  // Calculate artifact width based on sidebar state
  $: artifactWidth = $isSidebarExpanded ? '35%' : '40%';

  onMount(() => {
    // Auto-scroll to bottom when streaming
    if (isStreaming) {
      const contentElement = document.querySelector('.artifact-content pre');
      if (contentElement) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
    }
  });

  $: if (isStreaming && code) {
    // Auto-scroll during streaming
    setTimeout(() => {
      const contentElement = document.querySelector('.artifact-content pre');
      if (contentElement) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
    }, 50);
  }
</script>

{#if show}
  <div class="artifact-container" style="width: {artifactWidth}">
    <div class="artifact-header">
      <span>{filename}</span>
      <div class="header-controls">
        {#if isStreaming}
          <span class="streaming-indicator">●</span>
        {/if}
        <button class="close-button" on:click={close}>
          <X size={20} />
        </button>
      </div>
    </div>
    <div class="artifact-content">
      <pre><code class="hljs">{@html highlightedCode}{#if isStreaming && code}<span class="cursor">|</span>{/if}</code></pre>
    </div>
  </div>
{/if}

<style>
  .artifact-container {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    background: #0d1117; /* Dark background for IDE feel */
    color: #c9d1d9;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
    z-index: 500; /* Lower z-index to allow interaction with chat */
    transform: translateX(100%);
    animation: slide-in 0.3s ease-out forwards;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #30363d;
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .artifact-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    font-family: monospace;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .streaming-indicator {
    color: #f85149;
    font-size: 0.75rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  .close-button:hover {
    color: var(--text-color);
    background: rgba(255, 255, 255, 0.1);
  }

  .artifact-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0;
    font-family: monospace;
  }

  .artifact-content pre {
    margin: 0;
    height: 100%;
  }

  .artifact-content code.hljs {
    padding: 1rem;
    font-size: 0.9rem;
    line-height: 1.5;
    height: 100%;
    box-sizing: border-box;
    display: block;
  }

  .cursor {
    animation: blink 1s infinite;
    color: #f85149;
    font-weight: bold;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  @media (max-width: 768px) {
    .artifact-container {
      width: 100% !important;
    }
  }
</style>