<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
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

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  $: highlightedCode = (() => {
    const lang = filename.split('.').pop() || '';
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    // Fallback for plaintext or unknown languages
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  })();

</script>

{#if show}
  <div class="artifact-overlay" on:click={close}></div>
  <div class="artifact-container">
    <div class="artifact-header">
      <span>{filename}</span>
      <button class="close-button" on:click={close}>
        <X size={20} />
      </button>
    </div>
    <div class="artifact-content">
      <pre><code class="hljs">{@html highlightedCode}</code></pre>
    </div>
  </div>
{/if}

<style>
  .artifact-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  .artifact-container {
    position: fixed;
    top: 0;
    right: 0;
    width: 40%;
    height: 100vh;
    background: #0d1117; /* Dark background for IDE feel */
    color: #c9d1d9;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
    z-index: 1001;
    transform: translateX(100%);
    animation: slide-in 0.3s ease-out forwards;
    display: flex;
    flex-direction: column;
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

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.25rem;
  }
  .close-button:hover {
    color: var(--text-color);
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
  }

  @media (max-width: 768px) {
    .artifact-container {
      width: 100%;
    }
  }
</style>