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
      <button class="suggestion-card" on:click={() => handleSelect(suggestion.prompt)}>
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
    gap: 0.875rem;
  }

  .suggestion-card {
    border-radius: 12px;
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    backdrop-filter: blur(8px);
    position: relative;
    overflow: hidden;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    /* Default light theme */
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  /* Dark theme adjustments */
  :global([data-theme="dark"]) .suggestion-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .suggestion-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(20, 184, 166, 0.05));
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: inherit;
  }

  .suggestion-card:hover {
    transform: translateY(-1px);
    border-color: rgba(20, 184, 166, 0.3);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.04),
      0 2px 4px rgba(20, 184, 166, 0.1);
  }

  .suggestion-card:hover::before {
    opacity: 1;
  }

  .suggestion-card:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
  }

  /* Dark theme hover adjustments */
  :global([data-theme="dark"]) .suggestion-card:hover {
    border-color: rgba(20, 184, 166, 0.4);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(20, 184, 166, 0.15);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .suggestions-container {
      margin-top: 0.75rem;
    }
    
    .suggestions-grid {
      gap: 0.625rem;
    }
    
    .suggestion-card {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      min-height: 40px;
    }
  }

  @media (max-width: 480px) {
    .suggestions-grid {
      gap: 0.5rem;
    }
    
    .suggestion-card {
      padding: 0.5rem 0.875rem;
      font-size: 0.8rem;
      min-height: 38px;
    }
  }
</style>