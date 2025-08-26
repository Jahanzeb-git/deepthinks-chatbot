<script lang="ts">
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
  import { X, Copy, Download, Check } from 'lucide-svelte';
  import { isSidebarExpanded } from '../../stores/sidebar';
  import { artifactWidth } from '../../stores/artifact';
  import { themeStore } from '../../stores/theme';
  import hljs from 'highlight.js/lib/core';
  import javascript from 'highlight.js/lib/languages/javascript';
  import python from 'highlight.js/lib/languages/python';
  import typescript from 'highlight.js/lib/languages/typescript';
  import css from 'highlight.js/lib/languages/css';
  import xml from 'highlight.js/lib/languages/xml'; // For HTML
  import java from 'highlight.js/lib/languages/java';
  import c from 'highlight.js/lib/languages/c';
  import cpp from 'highlight.js/lib/languages/cpp';
  import go from 'highlight.js/lib/languages/go';
  import php from 'highlight.js/lib/languages/php';

  // Dynamically import HLJS theme
  let hljsTheme = '';
  themeStore.subscribe(theme => {
    if (theme === 'dark') {
      import('highlight.js/styles/github-dark.css').then(() => hljsTheme = 'dark');
    } else {
      import('highlight.js/styles/github.css').then(() => hljsTheme = 'light');
    }
  });

  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('c', c);
  hljs.registerLanguage('cpp', cpp);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('php', php);

  export let filename: string = '';
  export let code: string = '';
  export let show: boolean = false;
  export let isStreaming: boolean = false;

  const dispatch = createEventDispatcher();

  let container: HTMLDivElement;
  let isResizing = false;
  let isCopied = false;
  let contentElement: HTMLPreElement;
  let hasScrolledToBottom = false;

  const MIN_WIDTH_VW = 20;
  const MAX_WIDTH_VW = 80;

  // Language mapping for file extensions
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'sass': 'css',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'go': 'go',
    'php': 'php',
    'phtml': 'php',
    'php3': 'php',
    'php4': 'php',
    'php5': 'php',
    'phps': 'php'
  };

  function close() {
    dispatch('close');
    artifactWidth.set(0);
  }

  function handleMousedown() {
    isResizing = true;
  }

  function handleMouseup() {
    isResizing = false;
  }

  function handleMousemove(event: MouseEvent) {
    if (!isResizing) return;

    const viewportWidth = window.innerWidth;
    const newWidth = viewportWidth - event.clientX;
    const newWidthVw = (newWidth / viewportWidth) * 100;

    if (newWidthVw >= MIN_WIDTH_VW && newWidthVw <= MAX_WIDTH_VW) {
      artifactWidth.set(newWidth);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  }

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'code.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function checkAndScrollToBottom() {
    if (!contentElement || hasScrolledToBottom) return;
    
    const hasVerticalScrollbar = contentElement.scrollHeight > contentElement.clientHeight;
    
    if (hasVerticalScrollbar) {
      contentElement.scrollTop = contentElement.scrollHeight;
      hasScrolledToBottom = true;
    }
  }

  $: highlightedCode = (() => {
    if (!code) return '';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const lang = languageMap[extension] || extension;
    
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  })();

  $: {
    if (show && $artifactWidth === 0) {
      const initialWidthVw = $isSidebarExpanded ? 40 : 45;
      artifactWidth.set((window.innerWidth * initialWidthVw) / 100);
    } else if (!show) {
      artifactWidth.set(0);
      hasScrolledToBottom = false; // Reset when artifact is closed
    }
  }

  // Watch for code changes and check if scrollbar appears
  $: if (code && contentElement) {
    // Use setTimeout to ensure DOM has updated with new content
    setTimeout(() => {
      checkAndScrollToBottom();
    }, 10);
  }

  onMount(() => {
    window.addEventListener('mouseup', handleMouseup);
    window.addEventListener('mousemove', handleMousemove);

    return () => {
      window.removeEventListener('mouseup', handleMouseup);
      window.removeEventListener('mousemove', handleMousemove);
    };
  });

  afterUpdate(() => {
    if (isStreaming && code) {
      setTimeout(() => {
        if (!contentElement) {
          contentElement = container.querySelector('.artifact-content pre');
        }
        if (contentElement) {
          contentElement.scrollTop = contentElement.scrollHeight;
        }
      }, 50);
    } else if (!contentElement) {
      // Get reference to content element when not streaming
      contentElement = container?.querySelector('.artifact-content pre');
    }
  });
</script>

<svelte:window on:mouseup={handleMouseup} on:mousemove={handleMousemove} />

{#if show}
  <div
    class="artifact-container"
    bind:this={container}
    style="width: {$artifactWidth}px;"
    data-theme={$themeStore}
  >
    <div
      class="resize-handle"
      on:mousedown|stopPropagation={handleMousedown}
    >
      <div class="resize-indicator" />
    </div>
    <div class="artifact-header">
      <span class="filename">{filename}</span>
      <div class="header-controls">
        {#if isStreaming}
          <span class="streaming-indicator">●</span>
        {/if}
        <button 
          class="action-button copy-button" 
          on:click={copyCode}
          title="Copy code"
          disabled={isStreaming}
        >
          {#if isCopied}
            <Check size={16} />
          {:else}
            <Copy size={16} />
          {/if}
        </button>
        <button 
          class="action-button download-button" 
          on:click={downloadCode}
          title="Download file"
          disabled={isStreaming || !code}
        >
          <Download size={16} />
        </button>
        <button class="action-button close-button" on:click={close} title="Close">
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
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
    z-index: 500;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    animation: slide-in 0.3s ease-out forwards;
  }

  /* Theme-specific styles */
  .artifact-container[data-theme="dark"] {
    background: #0d1117;
    color: #c9d1d9;
    border-left: 1px solid #30363d;
  }

  .artifact-container[data-theme="light"] {
    background: #f7f7f7; /* Light gray background */
    color: #333;
    border-left: 1px solid #ddd;
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .resize-handle {
    position: absolute;
    left: -5px;
    top: 0;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .resize-indicator {
    width: 2px;
    height: 40px;
    background-color: rgba(128, 128, 128, 0.5);
    border-radius: 2px;
    transition: background-color 0.2s ease;
  }

  .resize-handle:hover .resize-indicator {
    background-color: var(--primary-color);
  }

  .artifact-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    font-family: monospace;
  }

  .artifact-container[data-theme="dark"] .artifact-header {
    background: #161b22;
    border-bottom: 1px solid #30363d;
  }

  .artifact-container[data-theme="light"] .artifact-header {
    background: #f7f7f7; /* Light gray for header */
    border-bottom: 1px solid #ddd;
  }

  .filename {
    font-weight: 500;
    font-size: 0.9rem;
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

  .action-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 4px;
    transition: background 0.2s ease, color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .artifact-container[data-theme="dark"] .action-button {
    color: var(--text-muted);
  }

  .artifact-container[data-theme="light"] .action-button {
    color: #555;
  }

  .action-button:hover:not(:disabled) {
    color: var(--text-color);
    background: rgba(128, 128, 128, 0.2);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .copy-button.copied {
    color: #10b981;
  }

  .artifact-container[data-theme="dark"] .copy-button.copied {
    color: #10b981;
  }

  .artifact-container[data-theme="light"] .copy-button.copied {
    color: #059669;
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

  .artifact-container[data-theme="light"] .artifact-content pre {
    background-color: #f7f7f7 !important; /* Ensure pre also has the light gray background */
    opacity: 1 !important; /* Force opacity for pre */
  }

  .artifact-content code.hljs {
    padding: 1rem;
    font-size: 0.9rem;
    line-height: 1.5;
    height: 100%;
    box-sizing: border-box;
    display: block;
  }

  .artifact-container[data-theme="light"] .artifact-content code.hljs {
    color: #24292e;
    background-color: #f7f7f7 !important; /* Light gray for code background */
    opacity: 1 !important;
  }

  .cursor {
    animation: blink 1s infinite;
    font-weight: bold;
  }

  .artifact-container[data-theme="dark"] .cursor {
    color: #f85149;
  }

  .artifact-container[data-theme="light"] .cursor {
    color: #d73a49;
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