<script lang="ts">
  import { Mail, Check, X, ChevronDown, ExternalLink, AlertCircle, Loader2 } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
  import { emailToolStore } from '../../stores/emailTool';
  import { sendApprovalResponse, getGmailOAuthUrl } from '../../lib/emailSocket';

  export let query: string = '';
  export let isActive: boolean = false;

  let isExpanded = false;
  let displayedReasoning = '';
  let typingInterval: ReturnType<typeof setInterval> | null = null;
  let targetReasoning = '';

  $: state = $emailToolStore;
  
  // Typing animation effect for reasoning
  $: if (state.reasoning !== targetReasoning) {
    targetReasoning = state.reasoning;
    startTypingAnimation();
  }

  function startTypingAnimation() {
    if (typingInterval) {
      clearInterval(typingInterval);
    }
    
    const target = targetReasoning;
    let currentIndex = displayedReasoning.length;
    
    // If new reasoning is shorter or completely different, reset
    if (!target.startsWith(displayedReasoning)) {
      displayedReasoning = '';
      currentIndex = 0;
    }
    
    typingInterval = setInterval(() => {
      if (currentIndex < target.length) {
        displayedReasoning = target.substring(0, currentIndex + 1);
        currentIndex++;
      } else {
        if (typingInterval) {
          clearInterval(typingInterval);
          typingInterval = null;
        }
      }
    }, 15); // Fast typing speed
  }

  function toggleExpand() {
    if (state.isCompleted || state.error) {
      isExpanded = !isExpanded;
    }
  }

  function handleConnectGmail() {
    const url = getGmailOAuthUrl();
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      url,
      'gmail-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
  }

  function handleApprove() {
    sendApprovalResponse(true);
  }

  function handleReject() {
    sendApprovalResponse(false);
  }

  function formatEmailBody(body: string): string {
    return body.replace(/\\n/g, '\n').trim();
  }

  onDestroy(() => {
    if (typingInterval) {
      clearInterval(typingInterval);
    }
  });
</script>

<div class="email-tool-container" class:completed={state.isCompleted} class:error={!!state.error}>
  <button 
    class="email-header" 
    on:click={toggleExpand}
    class:clickable={state.isCompleted || state.error}
  >
    <div class="email-icon" class:active={state.isActive && !state.needsAuth && !state.needsApproval}>
      <Mail size={18} />
    </div>
    <div class="email-info">
      {#if state.error}
        <span class="email-label error">
          <AlertCircle size={14} />
          {state.error}
        </span>
      {:else if state.isCompleted && state.result}
        <span class="email-label completed">
          {#if state.result.cancelled}
            Task cancelled
          {:else}
            Task completed with {state.result.total_iterations || 0} steps
          {/if}
        </span>
      {:else if state.isActive}
        <span class="email-label">
          {#if state.currentIteration > 0}
            <span class="step-counter">Step {state.currentIteration}</span>
          {/if}
        </span>
      {:else}
        <span class="email-label">Email Tool</span>
      {/if}
    </div>
    {#if state.isCompleted || state.error}
      <div class="expand-icon" class:rotated={isExpanded}>
        <ChevronDown size={16} />
      </div>
    {/if}
  </button>

  <!-- Reasoning with typing animation -->
  {#if state.isActive && displayedReasoning && !state.needsAuth && !state.needsApproval}
    <div class="reasoning-container" transition:slide={{ duration: 200 }}>
      <p class="reasoning-text">{displayedReasoning}<span class="cursor">|</span></p>
    </div>
  {/if}

  <!-- Gmail Auth UI (inline, no modal) -->
  {#if state.needsAuth}
    <div class="auth-container" transition:slide={{ duration: 200 }}>
      <div class="auth-message">
        <AlertCircle size={16} />
        <span>{state.authMessage || 'Please connect your Gmail account to continue'}</span>
      </div>
      <button class="connect-gmail-btn" on:click={handleConnectGmail}>
        <Mail size={16} />
        Connect Gmail
      </button>
    </div>
  {/if}

  <!-- Email Approval UI (inline, no modal) -->
  {#if state.needsApproval && state.approvalData}
    <div class="approval-container" transition:slide={{ duration: 200 }}>
      <div class="approval-header">
        <span class="approval-title">Review Email Before Sending</span>
      </div>
      
      <div class="email-preview">
        <div class="email-field">
          <span class="field-label">To:</span>
          <span class="field-value">{state.approvalData.parameters.to.join(', ')}</span>
        </div>
        {#if state.approvalData.parameters.cc.length > 0}
          <div class="email-field">
            <span class="field-label">CC:</span>
            <span class="field-value">{state.approvalData.parameters.cc.join(', ')}</span>
          </div>
        {/if}
        {#if state.approvalData.parameters.bcc.length > 0}
          <div class="email-field">
            <span class="field-label">BCC:</span>
            <span class="field-value">{state.approvalData.parameters.bcc.join(', ')}</span>
          </div>
        {/if}
        <div class="email-field">
          <span class="field-label">Subject:</span>
          <span class="field-value subject">{state.approvalData.parameters.subject}</span>
        </div>
        <div class="email-body">
          <pre>{formatEmailBody(state.approvalData.parameters.body)}</pre>
        </div>
      </div>

      {#if state.approvalData.reasoning}
        <div class="approval-reasoning">
          <span class="reasoning-label">AI Reasoning:</span>
          <p>{state.approvalData.reasoning}</p>
        </div>
      {/if}

      <div class="approval-actions">
        <button class="reject-btn" on:click={handleReject}>
          <X size={16} />
          Reject
        </button>
        <button class="approve-btn" on:click={handleApprove}>
          <Check size={16} />
          Approve & Send
        </button>
      </div>
    </div>
  {/if}

  <!-- Expanded details for completed tasks -->
  {#if isExpanded && state.isCompleted && state.result}
    <div class="details-container" transition:slide={{ duration: 200 }}>
      {#if state.result.summary}
        <p class="summary-text">{state.result.summary}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .email-tool-container {
    margin: 0.75rem 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    overflow: hidden;
    background: transparent;
    width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    transition: all 0.3s ease;
  }

  :global([data-theme="dark"]) .email-tool-container {
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .email-tool-container.error {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .email-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: transparent;
    border: none;
    cursor: default;
    transition: all 0.2s ease;
    text-align: left;
  }

  .email-header.clickable {
    cursor: pointer;
  }

  .email-header.clickable:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  :global([data-theme="dark"]) .email-header.clickable:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .email-icon {
    color: rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: color 0.3s ease;
  }

  :global([data-theme="dark"]) .email-icon {
    color: rgba(255, 255, 255, 0.5);
  }

  .email-icon.active {
    animation: pulse 2s ease-in-out infinite;
    color: var(--primary-color);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .email-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .email-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    line-height: 1.5;
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .email-label.error {
    color: #ef4444;
  }

  .email-label.completed {
    color: var(--text-muted);
  }

  .step-counter {
    background: var(--primary-color);
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .expand-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.6;
  }

  .expand-icon.rotated {
    transform: rotate(180deg);
  }

  /* Reasoning Container */
  .reasoning-container {
    padding: 0 1.25rem 1rem 1.25rem;
  }

  .reasoning-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0;
  }

  .cursor {
    animation: blink 1s step-end infinite;
    color: var(--primary-color);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* Auth Container */
  .auth-container {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.01);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  :global([data-theme="dark"]) .auth-container {
    border-top-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  .auth-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .connect-gmail-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #ea4335;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: fit-content;
  }

  .connect-gmail-btn:hover {
    background: #d33426;
    transform: translateY(-1px);
  }

  /* Approval Container */
  .approval-container {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.01);
  }

  :global([data-theme="dark"]) .approval-container {
    border-top-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  .approval-header {
    margin-bottom: 0.75rem;
  }

  .approval-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .email-preview {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .email-field {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .field-label {
    color: var(--text-muted);
    min-width: 60px;
    flex-shrink: 0;
  }

  .field-value {
    color: var(--text-color);
    word-break: break-word;
  }

  .field-value.subject {
    font-weight: 500;
  }

  .email-body {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .email-body pre {
    font-family: inherit;
    font-size: 0.875rem;
    color: var(--text-color);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: 1.5;
  }

  .approval-reasoning {
    background: rgba(102, 126, 234, 0.05);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .reasoning-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .approval-reasoning p {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .approval-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .reject-btn, .approve-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reject-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
  }

  .reject-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #ef4444;
  }

  .approve-btn {
    background: #10b981;
    border: none;
    color: white;
  }

  .approve-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  /* Details Container */
  .details-container {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.01);
  }

  :global([data-theme="dark"]) .details-container {
    border-top-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  .summary-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
  }
</style>
