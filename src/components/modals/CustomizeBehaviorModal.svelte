<script lang="ts">
  import { settingsStore, type UserSettings } from '../../stores/settings';
  import Modal from './Modal.svelte';
  import { Check, Loader, Zap, Target, Brain } from 'lucide-svelte';
  import { get } from 'svelte/store';

  // Local state for form bindings
  let localSettings: Partial<UserSettings> = {};
  let systemPromptWordCount = 0;
  let isLoading = false;
  let saved = false;

  // Subscribe to the entire store to react to changes
  settingsStore.subscribe(store => {
    // Keep local state in sync with the store's settings
    localSettings = { ...store.settings };
    isLoading = store.isLoading;
    
    // Recalculate word count when settings change
    systemPromptWordCount = localSettings.system_prompt?.split(/\s+/).filter(Boolean).length || 0;
  });

  async function handleSave() {
    if (isLoading) return;
    saved = false;
    
    // Construct the payload with only the fields that can be changed in this modal
    const settingsToUpdate: Partial<UserSettings> = {
      system_prompt: localSettings.system_prompt,
      temperature: localSettings.temperature,
      top_p: localSettings.top_p,
    };

    await settingsStore.updateSettings(settingsToUpdate);
    
    // The store now handles the loading state, but we can show a saved confirmation
    const currentStore = get(settingsStore);
    if (!currentStore.error) {
      saved = true;
      setTimeout(() => {
        saved = false;
        settingsStore.closeCustomizeModal();
      }, 1000);
    }
  }

  function handleSystemPromptInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const words = target.value.split(/\s+/).filter(Boolean);
    
    if (words.length <= 200) {
      localSettings.system_prompt = target.value;
      systemPromptWordCount = words.length;
    } else {
      // Prevent user from exceeding the limit
      target.value = words.slice(0, 200).join(' ');
      localSettings.system_prompt = target.value;
      systemPromptWordCount = 200;
    }
  }

  const creativityOptions = [
    { label: 'Reserved', value: 0.2, desc: 'Consistent & predictable responses' },
    { label: 'Balanced', value: 0.7, desc: 'Mix of creativity & reliability' },
    { label: 'Creative', value: 1.0, desc: 'Highly creative & varied outputs' },
  ];

  const focusOptions = [
    { label: 'Broad', value: 0.5, desc: 'Explores diverse possibilities' },
    { label: 'Default', value: 1.0, desc: 'Standard focus level' },
    { label: 'Focused', value: 0.8, desc: 'Highly targeted responses' },
  ];
</script>

<Modal
  isOpen={$settingsStore.isCustomizeModalOpen}
  title="Customize Behavior"
  on:close={settingsStore.closeCustomizeModal}
  modalClass="customize-behavior-modal"
>
  <div class="form-container">
    <!-- System Prompt Section -->
    <div class="form-section">
      <div class="section-header">
        <div class="section-title">
          <Brain size={20} />
          <h3>System Prompt</h3>
        </div>
        <div class="section-subtitle">
          Define the AI's personality and behavior
        </div>
      </div>
      
      <div class="prompt-input-container">
        <textarea
          id="system-prompt"
          rows="6"
          value={localSettings.system_prompt || ''}
          on:input={handleSystemPromptInput}
          placeholder="e.g., You are a helpful assistant that speaks like a pirate..."
          disabled={isLoading}
          class="prompt-textarea"
        ></textarea>
        
        <div class="word-count-container">
          <div class="word-count-bar">
            <div 
              class="word-count-progress" 
              style="width: {(systemPromptWordCount / 200) * 100}%"
              class:warning={systemPromptWordCount > 160}
              class:danger={systemPromptWordCount >= 190}
            ></div>
          </div>
          <div class="word-count-text">
            <span class="current-count">{systemPromptWordCount}</span>
            <span class="max-count">/ 200 words</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Creativity Section -->
    <div class="form-section">
      <div class="section-header">
        <div class="section-title">
          <Zap size={20} />
          <h3>Creativity (Temperature)</h3>
        </div>
        <div class="section-subtitle">
          Controls response creativity and randomness. Current: {localSettings.temperature}
        </div>
      </div>
      
      <div class="option-selector">
        {#each creativityOptions as option}
          <button
            class="option-card"
            class:active={localSettings.temperature === option.value}
            on:click={() => (localSettings.temperature = option.value)}
            disabled={isLoading}
          >
            <div class="option-radio">
              <div class="radio-dot"></div>
            </div>
            <div class="option-content">
              <div class="option-label">{option.label}</div>
              <div class="option-desc">{option.desc}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Focus Section -->
    <div class="form-section">
      <div class="section-header">
        <div class="section-title">
          <Target size={20} />
          <h3>Focus (Top-P)</h3>
        </div>
        <div class="section-subtitle">
          Adjusts response focus and specificity. Current: {localSettings.top_p}
        </div>
      </div>
      
      <div class="option-selector">
        {#each focusOptions as option}
          <button
            class="option-card"
            class:active={localSettings.top_p === option.value}
            on:click={() => (localSettings.top_p = option.value)}
            disabled={isLoading}
          >
            <div class="option-radio">
              <div class="radio-dot"></div>
            </div>
            <div class="option-content">
              <div class="option-label">{option.label}</div>
              <div class="option-desc">{option.desc}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="form-actions">
      <button 
        class="btn-secondary" 
        on:click={settingsStore.closeCustomizeModal} 
        disabled={isLoading}
      >
        Cancel
      </button>
      <button 
        class="btn-primary" 
        on:click={handleSave} 
        disabled={isLoading}
        class:saved
      >
        {#if isLoading}
          <Loader size={18} class="spinner" />
          <span>Saving...</span>
        {:else if saved}
          <Check size={18} />
          <span>Saved!</span>
        {:else}
          <span>Save Changes</span>
        {/if}
      </button>
    </div>
  </div>
</Modal>

<style>
  :global(.customize-behavior-modal .modal-content) {
    max-width: 650px;
    width: 90vw;
    height: auto;
    max-height: 90vh;
  }

  .form-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 600px;
    margin: 0 auto;
    overflow-x: hidden;
  }

  .form-section {
    background: var(--background-color);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .form-section:hover {
    border-color: var(--primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .section-title h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .section-subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-left: 2.75rem;
  }

  /* System Prompt Styles */
  .prompt-input-container {
    position: relative;
  }

  .prompt-textarea {
    width: 100%;
    max-width: 100%;
    padding: 1rem;
    border-radius: 10px;
    border: 2px solid var(--border-color);
    background: var(--hover-color);
    color: var(--text-color);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    resize: vertical;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .prompt-textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--background-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
  }

  .word-count-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .word-count-bar {
    flex: 1;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    overflow: hidden;
  }

  .word-count-progress {
    height: 100%;
    background: var(--primary-color);
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  .word-count-progress.warning {
    background: #f59e0b;
  }

  .word-count-progress.danger {
    background: #ef4444;
  }

  .word-count-text {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .current-count {
    font-weight: 600;
    color: var(--text-color);
  }

  .max-count {
    color: var(--text-muted);
  }

  /* Option Selector Styles */
  .option-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .option-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--hover-color);
    border: 2px solid var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
  }

  .option-card:hover:not(:disabled) {
    border-color: var(--primary-color);
    background: var(--background-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .option-card.active {
    border-color: var(--primary-color);
    background: var(--background-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
  }

  .option-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option-radio {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    background: var(--background-color);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .option-card:hover:not(:disabled) .option-radio {
    border-color: var(--primary-color);
  }

  .option-card.active .option-radio {
    border-color: var(--primary-color);
    background: var(--primary-color);
  }

  .radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--background-color);
    transform: scale(0);
    transition: transform 0.2s ease;
  }

  .option-card.active .radio-dot {
    transform: scale(1);
  }

  .option-content {
    flex: 1;
    min-width: 0;
  }

  .option-label {
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  .option-desc {
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .option-card.active .option-label {
    color: var(--primary-color);
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
  }

  .btn-primary, .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    color: white;
    box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--primary-color-rgb), 0.4);
  }

  .btn-primary.saved {
    background: #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .btn-secondary {
    background: var(--hover-color);
    color: var(--text-color);
    border: 2px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--border-color);
    transform: translateY(-1px);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .form-container {
      gap: 1.5rem;
    }
    
    .form-section {
      padding: 1rem;
    }
    
    .section-title {
      gap: 0.5rem;
    }
    
    .section-subtitle {
      margin-left: 2rem;
    }
    
    .form-actions {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .btn-primary, .btn-secondary {
      justify-content: center;
    }
  }
</style>