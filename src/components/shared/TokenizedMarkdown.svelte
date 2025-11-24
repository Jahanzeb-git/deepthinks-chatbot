<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import SmoothText from './SmoothText.svelte';
  import CodeBlock from './CodeBlock.svelte';
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
    // marked.parser takes an array of tokens, but we have a single token.
    // We can wrap it in a 'links' object context if needed, but marked.parser([token]) works.
    // However, marked.parser expects a 'TokensList' which has a 'links' property.
    // A simpler way is to use token.raw if we trust it, or use marked.parse(token.text)? 
    // No, token.text might be missing block formatting.
    // marked.parser([token]) is the way, but we need to mock the links.
    const list: any = [token];
    list.links = {};
    const html = marked.parser(list);
    return DOMPurify.sanitize(html);
  }

  // We identify the "active" token as the last one IF we are streaming.
  // But marked.lexer might add a 'space' token at the end if there's trailing whitespace.
  // We should probably ignore trailing space tokens for the "active" check?
  $: activeIndex = isStreaming ? tokens.length - 1 : -1;

</script>

<div class="tokenized-markdown">
  {#each tokens as token, index (index)}
    {#if index === activeIndex && token.type !== 'code' && token.type !== 'space'}
      <!-- Active streaming block (non-code) -> Render smoothly as text -->
      <!-- We wrap in the appropriate tag based on type to match styles roughly -->
      {#if token.type === 'heading'}
        <svelte:element this={`h${token.depth}`} class="smooth-heading">
           <SmoothText text={token.text} />
        </svelte:element>
      {:else if token.type === 'blockquote'}
        <blockquote><SmoothText text={token.text} /></blockquote>
      {:else if token.type === 'list'}
        <!-- Lists are tricky to stream smoothly item by item if we treat the whole list as one block.
             marked parses the whole list as one token. 
             If we are in a list, we might just want to render it normally to avoid complexity, 
             OR we accept that the *current* list item might be jumpy. 
             For now, let's use SmoothText for the raw source of the list? 
             No, that looks like raw markdown. 
             Let's fallback to static rendering for complex blocks like lists/tables during streaming,
             and only use SmoothText for paragraphs/headings which are 90% of content. -->
        <div class="markdown-block">{@html renderStatic(token)}</div>
      {:else}
        <!-- Default to paragraph-like behavior -->
        <p class="smooth-paragraph"><SmoothText text={token.text} /></p>
      {/if}

    {:else}
      <!-- Completed block or Code block -> Render fully -->
      {#if token.type === 'code'}
        <CodeBlock 
          code={token.text} 
          language={token.lang || ''} 
          inline={false}
        />
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
  .markdown-block {
    display: block;
  }
  /* Ensure smooth text containers behave like blocks */
  .smooth-paragraph {
    display: block;
  }
</style>
