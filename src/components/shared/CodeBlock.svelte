<script lang="ts">
  import { Copy, Check } from 'lucide-svelte';
  import hljs from 'highlight.js';
  import { onMount, afterUpdate } from 'svelte';

  export let code: string;
  export let language: string = '';
  export let inline: boolean = false;

  let copied = false;
  let codeElement: HTMLElement;
  let displayLanguage = language || 'plaintext';
  let lastHighlightedCode = '';

  // Map common language aliases
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'cpp': 'cpp',
    'c++': 'cpp',
    'sh': 'bash',
    'yml': 'yaml',
    'md': 'markdown'
  };

  $: normalizedLang = languageMap[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  $: displayLanguage = normalizedLang === 'plaintext' ? 'text' : normalizedLang;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function highlightCode() {
    if (!codeElement || inline) return;
    
    // Skip if code hasn't changed
    if (code === lastHighlightedCode) return;
    lastHighlightedCode = code;
    
    try {
      if (normalizedLang && normalizedLang !== 'plaintext') {
        const highlighted = hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true });
        codeElement.innerHTML = highlighted.value;
      } else {
        const autoDetected = hljs.highlightAuto(code);
        codeElement.innerHTML = autoDetected.value;
        if (autoDetected.language) {
          displayLanguage = autoDetected.language;
        }
      }
    } catch (e) {
      console.error('Highlight error:', e);
      codeElement.textContent = code;
    }
  }

  // Highlight on mount
  onMount(() => {
    highlightCode();
  });

  // Re-highlight when code changes (for streaming)
  afterUpdate(() => {
    highlightCode();
  });
</script>

{#if inline}
  <code class="inline-code">{code}</code>
{:else}
  <div class="code-block-container">
    <div class="code-block-header">
      <span class="code-language">{displayLanguage}</span>
      <button class="code-copy-btn" on:click={handleCopy} title="Copy code">
        {#if copied}
          <Check size={16} />
        {:else}
          <Copy size={16} />
        {/if}
      </button>
    </div>
    <pre class="code-block-content"><code bind:this={codeElement} class="hljs">{code}</code></pre>
  </div>
{/if}

<style>
  .inline-code {
    display: inline; /* CRITICAL FIX */
    background: var(--surface-color);
    color: var(--primary-color);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    border: 1px solid var(--border-color);
    white-space: nowrap; /* Prevents breaking inline code */
  }

  .code-block-container {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--surface-color);
  }

  .code-block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--hover-color);
    border-bottom: 1px solid var(--border-color);
  }

  .code-language {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.05em;
  }

  .code-copy-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
  }

  .code-copy-btn:hover {
    background: var(--surface-color);
    color: var(--text-color);
    border-color: var(--primary-color);
  }

  .code-block-content {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    background: var(--background-color);
  }

  .code-block-content code {
    font-family: 'Courier New', Consolas, Monaco, monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-color);
  }

  /* Highlight.js theme adjustments */
  .code-block-content :global(.hljs) {
    background: transparent;
    padding: 0;
  }
</style>