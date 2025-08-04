<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Code, Mail, MessageSquare, Smile } from 'lucide-svelte';

  const dispatch = createEventDispatcher<{
    select: { prompt: string };
  }>();

  const suggestions = [
    {
      title: 'Tell me a joke',
      prompt: 'Tell me a short, witty joke.',
    },
    {
      title: 'Code an algorithm',
      prompt: 'Write a Python function to find the factorial of a number.',
    },
    {
      title: 'Write a story',
      prompt: 'Write a short story about a knight who befriends a dragon.',
    },
    {
      title: 'Email my friend',
      prompt: 'Draft an email to my friend Alex, asking how they are and suggesting we catch up next week.',
    },
  ];

  function handleSelect(prompt: string) {
    dispatch('select', { prompt });
  }
</script>

<div class="suggestions-container">
  <div class="suggestions-grid">
    {#each suggestions as suggestion}
      <button class="suggestion-pill" on:click={() => handleSelect(suggestion.prompt)}>
        {suggestion.title}
      </button>
    {/each}
  </div>
</div>

<style>
  .suggestions-container {
    width: 100%;
    max-width: 768px;
    margin: 1rem auto 0;
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    animation: fadeIn 0.5s 0.2s ease-out forwards;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .suggestions-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .suggestion-pill {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 9999px; /* Pill shape */
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    white-space: nowrap;
  }

  .suggestion-pill:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    border-color: var(--primary-color);
    background: var(--primary-color-translucent);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .suggestions-container {
      margin-top: 0.75rem;
    }
    .suggestion-pill {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }
</style>
