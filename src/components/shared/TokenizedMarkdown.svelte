<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import SmoothText from './SmoothText.svelte';
  import CodeBlock from './CodeBlock.svelte';
  import TableRenderer from './TableRenderer.svelte';
  import { createEventDispatcher } from 'svelte';

  export let content: string = '';
  export let isStreaming: boolean = false;

  const dispatch = createEventDispatcher();

  // Configure marked options if needed
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  $: tokens = marked.lexer(content);

  // Helper to render static markdown for completed blocks
  function renderStatic(token: any): string {
    const list: any = [token];
    list.links = {};
    const html = marked.parser(list);
    return DOMPurify.sanitize(html);
  }

  $: activeIndex = isStreaming ? tokens.length - 1 : -1;

</script>

<div class="tokenized-markdown">
  {#each tokens as token, index (index)}
    {#if index === activeIndex && token.type !== 'code' && token.type !== 'space'}
      <!-- Active streaming block (non-code) -> Render smoothly as text -->
      
      {#if token.type === 'table'}
        <!-- Use TableRenderer for tables -->
        <TableRenderer html={renderStatic(token)} />
      {:else if token.type === 'list' || token.type === 'blockquote'}
        <!-- Lists and blockquotes use static rendering -->
        <div class="markdown-block">{@html renderStatic(token)}</div>
      {:else if token.type === 'heading' && token.text !== undefined}
        <svelte:element this={`h${token.depth}`} class="smooth-heading">
           <SmoothText text={token.text} />
        </svelte:element>
      {:else if token.type === 'paragraph' && token.text !== undefined}
        <!-- Default paragraph rendering with smooth text -->
        <p class="smooth-paragraph"><SmoothText text={token.text} /></p>
      {:else if token.text !== undefined}
        <!-- Fallback for other simple token types with text property -->
        <p class="smooth-paragraph"><SmoothText text={token.text} /></p>
      {:else}
        <!-- Token has no text property - use static rendering as fallback -->
        <div class="markdown-block">{@html renderStatic(token)}</div>
      {/if}

    {:else}
      <!-- Completed block or Code block -> Render fully -->
      {#if token.type === 'code'}
        <CodeBlock 
          code={token.text} 
          language={token.lang || ''} 
          inline={false}
        />
      {:else if token.type === 'table'}
        <!-- Use TableRenderer for tables -->
        <TableRenderer html={renderStatic(token)} />
      {:else if token.type === 'space'}
        <!-- Ignore spaces or render them if needed -->
      {:else}
        <div class="markdown-block">{@html renderStatic(token)}</div>
      {/if}
    {/if}
  {/each}
</div>

<style>
  .tokenized-markdown :global(p) {
    margin: 0 0 1rem 0;
  }
  .tokenized-markdown :global(p:last-child) {
    margin-bottom: 0;
  }
  .tokenized-markdown :global(h1), 
  .tokenized-markdown :global(h2), 
  .tokenized-markdown :global(h3), 
  .tokenized-markdown :global(h4), 
  .tokenized-markdown :global(h5), 
  .tokenized-markdown :global(h6) {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
    line-height: 1.25;
  }
  .tokenized-markdown :global(blockquote) {
    border-left: 4px solid var(--border-color);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-muted);
  }
  .tokenized-markdown :global(ul), 
  .tokenized-markdown :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  .tokenized-markdown :global(li) {
    margin-bottom: 0.5rem;
  }
  
  /* Removed table styles as they are now handled by TableRenderer */
  
  .markdown-block {
    display: block;
  }
  /* Ensure smooth text containers behave like blocks */
  .smooth-paragraph {
    display: block;
  }
</style>
