<script lang="ts">
  import { Mail, Check, X, ChevronDown, AlertCircle } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import { emailToolStore, type EmailToolState, type IterationStep } from '../../stores/emailTool';
  import { sendApprovalResponse, getGmailOAuthUrl } from '../../lib/emailSocket';

  // ============================================================================
  // Props
  // ============================================================================
  
  export let messageId: string;
  export let query: string = '';

  // ============================================================================
  // Local State
  // ============================================================================

  let isExpanded = true; // Start expanded to show steps
  let scrollContainer: HTMLDivElement;

  // ============================================================================
  // Reactive State - Keep it simple!
  // ============================================================================

  // Get state for THIS specific email tool instance
  $: state = $emailToolStore[messageId] as EmailToolState | undefined;

  // Default state if not found
  $: safeState = state ?? {
    messageId,
    isActive: false,
    currentIteration: 0,
    iterations: [] as IterationStep[],
    needsAuth: false,
    authMessage: null,
    needsApproval: false,
    approvalData: null,
    isCompleted: false,
    result: null,
    error: null,
  };

  // Debug logging
  $: console.log(`🎨 EmailToolUI [${messageId.substring(0, 8)}]:`, {
    needsAuth: safeState.needsAuth,
    iterations: safeState.iterations.length,
    isCompleted: safeState.isCompleted,
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function toggleExpand() {
    isExpanded = !isExpanded;
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
    if (!body) return '';
    return body.replace(/\\n/g, '\n').trim();
  }

  // Helper to format recipients - handles both string and array format from backend
  function formatRecipients(recipients: string | string[] | undefined | null): string {
    if (!recipients) return 'N/A';
    if (Array.isArray(recipients)) {
      return recipients.length > 0 ? recipients.join(', ') : 'N/A';
    }
    return recipients; // Already a string
  }
</script>

<div 
  class="email-tool-container" 
  class:completed={safeState.isCompleted} 
  class:has-error={!!safeState.error}
>
  <!-- Header -->
  <button class="email-header" on:click={toggleExpand}>
    <div class="email-icon" class:active={safeState.isActive}>
      <Mail size={18} />
    </div>
    
    <div class="email-info">
      {#if safeState.error}
        <span class="email-label error">
          <AlertCircle size={14} />
          {safeState.error}
        </span>
      {:else if safeState.isCompleted && safeState.result}
        <span class="email-label completed">
          <Check size={14} />
          {#if safeState.result.cancelled}
            Task cancelled
          {:else}
            Completed with {safeState.result.total_iterations || safeState.iterations.length} steps
          {/if}
        </span>
      {:else if safeState.needsAuth}
        <span class="email-label auth-needed">
          Gmail Authentication Required
        </span>
      {:else if safeState.iterations.length > 0}
        <span class="email-label active">
          Step {safeState.currentIteration} - Processing...
        </span>
      {:else if safeState.isActive}
        <span class="email-label active">
          Starting email task...
        </span>
      {:else}
        <span class="email-label">Email Tool</span>
      {/if}
    </div>
    
    <div class="expand-icon" class:rotated={isExpanded}>
      <ChevronDown size={16} />
    </div>
  </button>

  <!-- Content Area -->
  {#if isExpanded}
    <div class="email-content" transition:slide={{ duration: 200 }}>
      
      <!-- Gmail Auth UI -->
      {#if safeState.needsAuth}
        <div class="auth-container">
          <div class="auth-content">
            <div class="auth-icon">
              <AlertCircle size={20} />
            </div>
            <div class="auth-text">
              <span class="auth-title">Connect Gmail to Continue</span>
              <span class="auth-message">{safeState.authMessage || 'Authentication required to access your emails'}</span>
            </div>
          </div>
          <button class="connect-gmail-btn" on:click={handleConnectGmail}>
            <Mail size={16} />
            Connect Gmail
          </button>
        </div>
      {/if}

      <!-- Steps Timeline -->
      {#if safeState.iterations.length > 0 && !safeState.needsAuth}
        <div class="steps-container" bind:this={scrollContainer}>
          {#each safeState.iterations as step (step.iteration)}
            <div class="step-item" class:active={!step.isComplete}>
              <div class="step-header">
                <div class="step-badge" class:active={!step.isComplete}>
                  <span class="step-number">{step.iteration}</span>
                </div>
                <span class="step-label">Step {step.iteration}</span>
              </div>
              
              <div class="step-content">
                <p class="step-reasoning">{step.reasoning || 'Processing...'}</p>

                <!-- Approval UI embedded in step -->
                {#if step.approval && safeState.needsApproval}
                  <div class="step-approval">
                    <div class="approval-card">
                      <div class="approval-header">
                        <span class="approval-title">Review Before Sending</span>
                      </div>
                      
                      <div class="email-preview">
                        <div class="email-field">
                          <span class="field-label">To</span>
                          <span class="field-value">{formatRecipients(step.approval.parameters?.to)}</span>
                        </div>
                        {#if step.approval.parameters?.cc}
                          <div class="email-field">
                            <span class="field-label">CC</span>
                            <span class="field-value">{formatRecipients(step.approval.parameters.cc)}</span>
                          </div>
                        {/if}
                        <div class="email-field">
                          <span class="field-label">Subject</span>
                          <span class="field-value subject">{step.approval.parameters?.subject || 'No subject'}</span>
                        </div>
                        <div class="email-body-preview">
                          <pre>{formatEmailBody(step.approval.parameters?.body || '')}</pre>
                        </div>
                      </div>

                      <div class="approval-actions">
                        <button class="reject-btn" on:click={handleReject}>
                          <X size={14} />
                          Reject
                        </button>
                        <button class="approve-btn" on:click={handleApprove}>
                          <Check size={14} />
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Completed Summary -->
      {#if safeState.isCompleted && safeState.result?.summary}
        <div class="summary-container">
          <div class="summary-label">Summary</div>
          <p class="summary-text">{safeState.result.summary}</p>
        </div>
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
    background: var(--surface-color);
    width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  :global([data-theme="dark"]) .email-tool-container {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .email-tool-container.has-error {
    border-color: rgba(239, 68, 68, 0.3);
  }

  /* Header */
  .email-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .email-header:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  :global([data-theme="dark"]) .email-header:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .email-icon {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(102, 126, 234, 0.08);
  }

  .email-icon.active {
    background: rgba(102, 126, 234, 0.15);
    color: var(--primary-color);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .email-info {
    flex: 1;
    min-width: 0;
  }

  .email-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .email-label.error { color: #ef4444; }
  .email-label.completed { color: #10b981; }
  .email-label.auth-needed { color: #f59e0b; }
  .email-label.active { color: var(--primary-color); }

  .expand-icon {
    color: var(--text-muted);
    transition: transform 0.2s ease;
  }

  .expand-icon.rotated {
    transform: rotate(180deg);
  }

  /* Content */
  .email-content {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  :global([data-theme="dark"]) .email-content {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  /* Auth Container */
  .auth-container {
    padding: 1rem;
    background: rgba(245, 158, 11, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  :global([data-theme="dark"]) .auth-container {
    background: rgba(245, 158, 11, 0.08);
  }

  .auth-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .auth-icon {
    color: #f59e0b;
    margin-top: 0.125rem;
  }

  .auth-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .auth-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .auth-message {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .connect-gmail-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: #ea4335;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    width: fit-content;
    transition: all 0.2s ease;
  }

  .connect-gmail-btn:hover {
    background: #d33426;
    transform: translateY(-1px);
  }

  /* Steps Container */
  .steps-container {
    padding: 1rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .step-item {
    position: relative;
    padding-left: 2rem;
    margin-bottom: 1rem;
  }

  .step-item:last-child {
    margin-bottom: 0;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .step-badge {
    position: absolute;
    left: 0;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 50%;
    background: var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-badge.active {
    background: var(--primary-color);
  }

  .step-number {
    font-size: 0.6875rem;
    font-weight: 600;
    color: white;
  }

  .step-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .step-reasoning {
    font-size: 0.875rem;
    color: var(--text-color);
    line-height: 1.55;
    margin: 0;
  }

  /* Approval Card */
  .step-approval {
    margin-top: 0.75rem;
  }

  .approval-card {
    background: rgba(102, 126, 234, 0.04);
    border: 1px solid rgba(102, 126, 234, 0.15);
    border-radius: 10px;
    overflow: hidden;
  }

  :global([data-theme="dark"]) .approval-card {
    background: rgba(102, 126, 234, 0.08);
  }

  .approval-header {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  }

  .approval-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary-color);
    text-transform: uppercase;
  }

  .email-preview {
    padding: 0.75rem 0.875rem;
  }

  .email-field {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    font-size: 0.8125rem;
  }

  .field-label {
    color: var(--text-muted);
    min-width: 50px;
    font-weight: 500;
  }

  .field-value {
    color: var(--text-color);
    word-break: break-word;
  }

  .field-value.subject {
    font-weight: 500;
  }

  .email-body-preview {
    margin-top: 0.625rem;
    padding-top: 0.625rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .email-body-preview pre {
    font-family: inherit;
    font-size: 0.8125rem;
    color: var(--text-color);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    max-height: 100px;
    overflow-y: auto;
  }

  .approval-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 0.625rem 0.875rem;
    border-top: 1px solid rgba(102, 126, 234, 0.1);
    background: rgba(0, 0, 0, 0.02);
  }

  .reject-btn, .approve-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    border-radius: 6px;
    font-size: 0.8125rem;
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
  }

  /* Summary */
  .summary-container {
    padding: 0.875rem 1rem;
    background: rgba(0, 0, 0, 0.02);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .summary-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.375rem;
  }

  .summary-text {
    font-size: 0.875rem;
    color: var(--text-color);
    margin: 0;
    line-height: 1.5;
  }
</style>
