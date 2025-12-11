<script lang="ts">
  import { Mail, Check, X, ChevronDown, AlertCircle, Loader2 } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  import { onDestroy, onMount, tick } from 'svelte';
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

  let isExpanded = false;
  let containerElement: HTMLDivElement;
  
  // Typing animation state - track per iteration
  let typingStates: { [iteration: number]: { displayed: string; target: string; interval: ReturnType<typeof setInterval> | null } } = {};

  // ============================================================================
  // Reactive State
  // ============================================================================

  // Get state for THIS specific email tool instance
  $: allStates = $emailToolStore;
  $: state = allStates[messageId] as EmailToolState | undefined;

  // Default state if not found
  $: safeState = state || {
    messageId,
    isActive: false,
    currentIteration: 0,
    iterations: [],
    needsAuth: false,
    authMessage: null,
    needsApproval: false,
    approvalData: null,
    isCompleted: false,
    result: null,
    error: null,
  };

  // Log state changes for debugging
  $: if (state) {
    console.log(`🎨 EmailToolUI [${messageId.substring(0, 8)}] state:`, {
      isActive: state.isActive,
      needsAuth: state.needsAuth,
      iterations: state.iterations.length,
      isCompleted: state.isCompleted,
      error: state.error,
    });
  }

  // ============================================================================
  // Typing Animation Logic
  // ============================================================================

  // Watch for iteration changes and start/update typing animations
  $: if (safeState.iterations) {
    handleIterationsChange(safeState.iterations);
  }

  function handleIterationsChange(iterations: IterationStep[]) {
    iterations.forEach((step) => {
      const existing = typingStates[step.iteration];
      
      if (!existing) {
        // New iteration - start typing from scratch
        typingStates[step.iteration] = {
          displayed: '',
          target: step.reasoning,
          interval: null,
        };
        startTypingForIteration(step.iteration);
      } else if (existing.target !== step.reasoning) {
        // Reasoning updated - continue from current position if possible
        existing.target = step.reasoning;
        if (!existing.interval && existing.displayed.length < step.reasoning.length) {
          startTypingForIteration(step.iteration);
        }
      }
    });
  }

  function startTypingForIteration(iteration: number) {
    const state = typingStates[iteration];
    if (!state || state.interval) return;

    const target = state.target;
    
    // If new reasoning doesn't start with current displayed, reset
    if (!target.startsWith(state.displayed)) {
      state.displayed = '';
    }

    state.interval = setInterval(() => {
      if (state.displayed.length < target.length) {
        state.displayed = target.substring(0, state.displayed.length + 1);
        typingStates = { ...typingStates }; // Trigger reactivity
      } else {
        if (state.interval) {
          clearInterval(state.interval);
          state.interval = null;
        }
      }
    }, 12); // Smooth typing speed
  }

  function getDisplayedReasoning(iteration: number): string {
    return typingStates[iteration]?.displayed || '';
  }

  function isStillTyping(iteration: number): boolean {
    const state = typingStates[iteration];
    if (!state) return false;
    return state.displayed.length < state.target.length;
  }

  // ============================================================================
  // Auto-scroll to bottom when new content arrives
  // ============================================================================

  $: if (safeState.iterations.length > 0 && containerElement) {
    tick().then(() => {
      if (containerElement) {
        containerElement.scrollTop = containerElement.scrollHeight;
      }
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function toggleExpand() {
    if (safeState.isCompleted || safeState.error) {
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

  // ============================================================================
  // Cleanup
  // ============================================================================

  onDestroy(() => {
    // Clear all typing intervals
    Object.values(typingStates).forEach(state => {
      if (state.interval) {
        clearInterval(state.interval);
      }
    });
    typingStates = {};
  });
</script>

<div 
  class="email-tool-container" 
  class:completed={safeState.isCompleted} 
  class:error={!!safeState.error}
  class:has-steps={safeState.iterations.length > 0}
>
  <!-- Header -->
  <button 
    class="email-header" 
    on:click={toggleExpand}
    class:clickable={safeState.isCompleted || safeState.error}
  >
    <div class="email-icon" class:active={safeState.isActive && !safeState.needsAuth && !safeState.needsApproval}>
      {#if safeState.isActive && !safeState.needsAuth}
        <div class="icon-pulse">
          <Mail size={18} />
        </div>
      {:else}
        <Mail size={18} />
      {/if}
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
      {:else if safeState.isActive}
        <span class="email-label active">
          Processing email request...
        </span>
      {:else}
        <span class="email-label">Email Tool</span>
      {/if}
    </div>
    
    {#if safeState.isCompleted || safeState.error}
      <div class="expand-icon" class:rotated={isExpanded}>
        <ChevronDown size={16} />
      </div>
    {/if}
  </button>

  <!-- Gmail Auth UI -->
  {#if safeState.needsAuth}
    <div class="auth-container" transition:slide={{ duration: 200 }}>
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

  <!-- Steps Timeline (Scrollable) -->
  {#if safeState.iterations.length > 0 && !safeState.needsAuth}
    <div 
      class="steps-container" 
      bind:this={containerElement}
      transition:slide={{ duration: 200 }}
    >
      {#each safeState.iterations as step, index (step.iteration)}
        <div 
          class="step-item" 
          class:active={step.isTyping && !step.isComplete}
          class:completed={step.isComplete}
          in:slide={{ duration: 250, delay: 50 }}
        >
          <!-- Connector line to previous step -->
          {#if index > 0}
            <div class="step-connector">
              <div class="connector-line" class:animated={!safeState.iterations[index - 1]?.isComplete}></div>
            </div>
          {/if}

          <!-- Step Header with Badge -->
          <div class="step-header">
            <div class="step-badge" class:active={step.isTyping && !step.isComplete}>
              <span class="step-number">{step.iteration}</span>
            </div>
            <span class="step-label">Step {step.iteration}</span>
          </div>

          <!-- Step Reasoning with Typing Animation -->
          <div class="step-content">
            <p class="step-reasoning">
              {getDisplayedReasoning(step.iteration)}{#if isStillTyping(step.iteration)}<span class="typing-cursor">|</span>{/if}
            </p>

            <!-- Approval UI embedded in this step -->
            {#if step.approval && safeState.needsApproval}
              <div class="step-approval" transition:slide={{ duration: 200 }}>
                <div class="approval-card">
                  <div class="approval-header">
                    <span class="approval-title">Review Before Sending</span>
                  </div>
                  
                  <div class="email-preview">
                    <div class="email-field">
                      <span class="field-label">To</span>
                      <span class="field-value">{step.approval.parameters.to?.join(', ') || 'N/A'}</span>
                    </div>
                    {#if step.approval.parameters.cc?.length > 0}
                      <div class="email-field">
                        <span class="field-label">CC</span>
                        <span class="field-value">{step.approval.parameters.cc.join(', ')}</span>
                      </div>
                    {/if}
                    {#if step.approval.parameters.bcc?.length > 0}
                      <div class="email-field">
                        <span class="field-label">BCC</span>
                        <span class="field-value">{step.approval.parameters.bcc.join(', ')}</span>
                      </div>
                    {/if}
                    <div class="email-field">
                      <span class="field-label">Subject</span>
                      <span class="field-value subject">{step.approval.parameters.subject || 'No subject'}</span>
                    </div>
                    <div class="email-body-preview">
                      <pre>{formatEmailBody(step.approval.parameters.body || '')}</pre>
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

  <!-- Expanded Summary for Completed Tasks -->
  {#if isExpanded && safeState.isCompleted && safeState.result?.summary}
    <div class="summary-container" transition:slide={{ duration: 200 }}>
      <div class="summary-label">Summary</div>
      <p class="summary-text">{safeState.result.summary}</p>
    </div>
  {/if}
</div>

<style>
  /* ============================================================================
   * Container
   * ============================================================================ */
  
  .email-tool-container {
    margin: 0.75rem 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-color);
    width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
  }

  :global([data-theme="dark"]) .email-tool-container {
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .email-tool-container.error {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .email-tool-container.has-steps {
    max-height: 400px;
    display: flex;
    flex-direction: column;
  }

  /* ============================================================================
   * Header
   * ============================================================================ */

  .email-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: transparent;
    border: none;
    cursor: default;
    transition: all 0.2s ease;
    text-align: left;
    flex-shrink: 0;
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
    color: var(--text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(102, 126, 234, 0.08);
    transition: all 0.3s ease;
  }

  .email-icon.active {
    background: rgba(102, 126, 234, 0.15);
    color: var(--primary-color);
  }

  .icon-pulse {
    animation: iconPulse 2s ease-in-out infinite;
  }

  @keyframes iconPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.95); }
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
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .email-label.error {
    color: #ef4444;
  }

  .email-label.completed {
    color: #10b981;
  }

  .email-label.auth-needed {
    color: #f59e0b;
  }

  .email-label.active {
    color: var(--primary-color);
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

  /* ============================================================================
   * Auth Container
   * ============================================================================ */

  .auth-container {
    padding: 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(245, 158, 11, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  :global([data-theme="dark"]) .auth-container {
    border-top-color: rgba(255, 255, 255, 0.06);
    background: rgba(245, 158, 11, 0.08);
  }

  .auth-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .auth-icon {
    flex-shrink: 0;
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
    line-height: 1.4;
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
    transition: all 0.2s ease;
    width: fit-content;
  }

  .connect-gmail-btn:hover {
    background: #d33426;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(234, 67, 53, 0.3);
  }

  /* ============================================================================
   * Steps Timeline Container
   * ============================================================================ */

  .steps-container {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  :global([data-theme="dark"]) .steps-container {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .steps-container::-webkit-scrollbar {
    width: 4px;
  }

  .steps-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .steps-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  /* ============================================================================
   * Step Item
   * ============================================================================ */

  .step-item {
    position: relative;
    padding-left: 2rem;
  }

  .step-item:not(:first-child) {
    margin-top: 0.75rem;
  }

  /* Connector Line */
  .step-connector {
    position: absolute;
    left: 0.6875rem;
    top: -0.75rem;
    width: 2px;
    height: 0.75rem;
  }

  .connector-line {
    width: 100%;
    height: 100%;
    background: var(--border-color);
    border-radius: 1px;
  }

  .connector-line.animated {
    background: linear-gradient(180deg, var(--border-color) 0%, var(--primary-color) 100%);
    animation: connectorGrow 0.3s ease-out;
  }

  @keyframes connectorGrow {
    from { height: 0; }
    to { height: 100%; }
  }

  /* Step Header */
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
    transition: all 0.2s ease;
  }

  .step-badge.active {
    background: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
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

  /* Step Content */
  .step-content {
    padding-left: 0;
  }

  .step-reasoning {
    font-size: 0.875rem;
    color: var(--text-color);
    line-height: 1.55;
    margin: 0;
  }

  .typing-cursor {
    color: var(--primary-color);
    animation: blink 1s step-end infinite;
    font-weight: 300;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* ============================================================================
   * Approval Card (Embedded in Step)
   * ============================================================================ */

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
    border-color: rgba(102, 126, 234, 0.2);
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
    letter-spacing: 0.03em;
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

  .email-field:last-of-type {
    margin-bottom: 0;
  }

  .field-label {
    color: var(--text-muted);
    min-width: 50px;
    flex-shrink: 0;
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

  :global([data-theme="dark"]) .email-body-preview {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .email-body-preview pre {
    font-family: inherit;
    font-size: 0.8125rem;
    color: var(--text-color);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: 1.5;
    max-height: 120px;
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

  :global([data-theme="dark"]) .approval-actions {
    background: rgba(255, 255, 255, 0.02);
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
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  }

  /* ============================================================================
   * Summary Container
   * ============================================================================ */

  .summary-container {
    padding: 0.875rem 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.02);
  }

  :global([data-theme="dark"]) .summary-container {
    border-top-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  .summary-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.375rem;
  }

  .summary-text {
    font-size: 0.875rem;
    color: var(--text-color);
    margin: 0;
    line-height: 1.5;
  }
</style>
