<script lang="ts">
  import { afterUpdate } from 'svelte';

  export let text: string = '';
  
  // We keep track of "committed" text and "new" text chunks
  interface TextChunk {
    id: number;
    content: string;
    isNew: boolean;
  }

  let chunks: TextChunk[] = [];
  let lastTextLength = 0;
  let chunkIdCounter = 0;

  // Reset chunks if text completely changes (not an append)
  $: if (text.length < lastTextLength || !text.startsWith(chunks.map(c => c.content).join(''))) {
    chunks = [{ id: chunkIdCounter++, content: text, isNew: false }];
    lastTextLength = text.length;
  } else if (text.length > lastTextLength) {
    // It's an append!
    const newContent = text.slice(lastTextLength);
    if (newContent) {
      chunks = [...chunks, { id: chunkIdCounter++, content: newContent, isNew: true }];
      lastTextLength = text.length;
    }
  }

  // After a render, mark "new" chunks as old so they don't animate again if we re-render for other reasons
  afterUpdate(() => {
    const newChunks = chunks.filter(c => c.isNew);
    if (newChunks.length > 0) {
      // Use a small timeout to allow the animation to play before removing the class? 
      // Actually, we just need to remove the 'isNew' flag from the state *eventually* 
      // or just let them stay 'isNew' until the component is destroyed?
      // Better: The animation runs once when the element enters. 
      // If we keep `isNew` true, it might re-animate if Svelte re-creates the node.
      // But since we key by `id`, Svelte preserves the node.
      // So we don't strictly need to unset `isNew`, but it's cleaner to do so.
      
      // However, modifying state in afterUpdate can cause loops. 
      // Let's rely on the fact that the chunk is added *once* to the array.
    }
  });

</script>

<span class="smooth-text-container">
  {#each chunks as chunk (chunk.id)}
    <span class:fade-in={chunk.isNew}>{chunk.content}</span>
  {/each}
</span>

<style>
  .fade-in {
    animation: fadeIn 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    opacity: 0;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
