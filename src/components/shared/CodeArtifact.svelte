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
  hljs.registerLanguage('jsx', javascript); 
  hljs.registerLanguage('tsx', typescript);  
  hljs.registerLanguage('svelte', xml);



  export let filename: string = '';
  export let code: string = '';
  export let show: boolean = false;
  export let isStreaming: boolean = false;
  export let version: number | undefined = undefined;
  
  const dispatch = createEventDispatcher();

  let container: HTMLDivElement;
  let isResizing = false;
  let isCopied = false;
  let contentElement: HTMLPreElement;
  let shouldAutoScroll = true;
  let userHasScrolled = false;
  let scrollTimeout: NodeJS.Timeout;

  const MIN_WIDTH_VW = 20;
  const MAX_WIDTH_VW = 80;

  // Language mapping for file extensions
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'svelte': 'svelte',
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
    // Reset scroll state when closing
    shouldAutoScroll = true;
    userHasScrolled = false;
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

  // Handle user scrolling
  function handleScroll() {
    if (!contentElement || !isStreaming) return;

    const isAtBottom = contentElement.scrollTop + contentElement.clientHeight >= contentElement.scrollHeight - 10;
    
    // If user scrolled up from bottom, disable auto-scroll
    if (!isAtBottom && shouldAutoScroll) {
      shouldAutoScroll = false;
      userHasScrolled = true;
    }
    
    // If user scrolled back to bottom, re-enable auto-scroll
    if (isAtBottom && userHasScrolled) {
      shouldAutoScroll = true;
      userHasScrolled = false;
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

  function scrollToBottom() {
    if (contentElement && shouldAutoScroll && isStreaming) {
      contentElement.scrollTop = contentElement.scrollHeight;
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
      // Reset scroll state when artifact is closed
      shouldAutoScroll = true;
      userHasScrolled = false;
    }
  }

  // Watch for code changes and auto-scroll if needed
  $: if (code && isStreaming) {
    // Debounce scrolling to avoid excessive calls
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scrollToBottom();
    }, 10);
  }

  // Reset auto-scroll when streaming starts
  $: if (isStreaming) {
    shouldAutoScroll = true;
    userHasScrolled = false;
  }

  onMount(() => {
    window.addEventListener('mouseup', handleMouseup);
    window.addEventListener('mousemove', handleMousemove);

    return () => {
      window.removeEventListener('mouseup', handleMouseup);
      window.removeEventListener('mousemove', handleMousemove);
      clearTimeout(scrollTimeout);
    };
  });

  afterUpdate(() => {
    if (!contentElement) {
      contentElement = container?.querySelector('.artifact-content pre');
      if (contentElement) {
        contentElement.addEventListener('scroll', handleScroll);
      }
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
      <div class="filename-container">
        <span class="filename">{filename}</span>
        {#if version !== undefined}
          <span class="version-badge">v{version}</span>
        {/if}
      </div>
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
    background: var(--background-color);
    color: var(--text-color);
    border-left: 1px solid var(--border-color);
    z-index: 500;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    animation: slide-in 0.3s ease-out forwards;
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
    background: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    font-family: monospace;
  }

  .filename {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text-color);
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
    color: var(--text-muted);
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

  .artifact-content {
    flex-grow: 1;
    overflow: hidden;
    font-family: monospace;
  }

  .artifact-content pre {
    margin: 0;
    height: 100%;
    overflow-y: auto;
    scroll-behavior: smooth;
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
    font-weight: bold;
    color: #f85149;
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

  .filename-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  } 

  .version-badge {
    font-size: 0.75rem;
    font-weight: 500;
    color: #14b8a6;
    background: rgba(20, 184, 166, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }

  /* Dark theme version badge */
  .artifact-container[data-theme="dark"] .version-badge {
    color: #5eead4;
    background: rgba(94, 234, 212, 0.1);
  }

  /* Dark theme cursor */
  .artifact-container[data-theme="dark"] .cursor {
    color: #f85149;
  }

  /* Light theme cursor */
  .artifact-container[data-theme="light"] .cursor {
    color: #d73a49;
  }
</style>