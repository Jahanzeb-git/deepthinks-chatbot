<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';

  export let content: string = '';
  export let speed: number = 10; // ms per character

  let displayedHtml = '';
  let currentIndex = 0;
  let timeout: any;
  let isTag = false;

  // Reset when content changes significantly (e.g. new message)
  // But for streaming, we just want to append.
  // Actually, for streaming, the content prop grows. 
  // We need to catch up displayedHtml to content.

  $: if (content) {
    processContent();
  }

  function processContent() {
    if (currentIndex >= content.length) return;

    clearTimeout(timeout);

    const char = content[currentIndex];

    if (char === '<') {
      isTag = true;
    }

    if (isTag) {
      // Fast forward through tags to prevent broken HTML
      let tagBuffer = '';
      while (currentIndex < content.length) {
        const c = content[currentIndex];
        tagBuffer += c;
        currentIndex++;
        if (c === '>') {
          isTag = false;
          break;
        }
      }
      displayedHtml += tagBuffer;
      // Continue immediately
      processContent();
    } else {
      // Normal text character
      displayedHtml += char;
      currentIndex++;
      
      // Schedule next character
      timeout = setTimeout(processContent, speed);
    }
  }

  onMount(() => {
    return () => clearTimeout(timeout);
  });
</script>

<div class="smooth-html">
  {@html displayedHtml}
</div>

<style>
  .smooth-html {
    display: inline;
  }
  
  /* Ensure children inherit styles correctly */
  .smooth-html :global(p) {
    display: inline;
    margin: 0;
  }
  
  .smooth-html :global(p:has(+ p)) {
    display: block;
    margin-bottom: 1rem;
  }
</style>
