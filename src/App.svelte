<script lang="ts">
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { authStore } from './stores/auth';
  import { sessionStore } from './stores/session';
  import { themeStore } from './stores/theme';
  import { chatStore } from './stores/chat';
  import { historyStore } from './stores/history';
  import { settingsStore } from './stores/settings';
  import { isSidebarExpanded } from './stores/sidebar';
  import { aboutModalStore } from './stores/about';
  import { analyticsStore } from './stores/analytics';
  import { sessionUuidStore } from './stores/sessionUuid';
  import { shareStore } from './stores/share';
  import { artifactStore } from './stores/artifact';
  import { fileStore } from './stores/file';
  import { api } from './lib/api';
  import { generateSessionId } from './lib/utils';
  import { derived, get } from 'svelte/store';
  import { StreamProcessor } from './lib/stream-processor';

  import Sidebar from './components/Sidebar.svelte';
  import ChatContainer from './components/ChatContainer.svelte';
  import ChatInput from './components/ChatInput.svelte';
  import Auth from './routes/Auth.svelte';
  import CustomizeBehaviorModal from './components/modals/CustomizeBehaviorModal.svelte';
  import SettingsModal from './components/modals/SettingsModal.svelte';
  import AboutModal from './components/modals/AboutModal.svelte';
  import AnalyticsModal from './components/modals/AnalyticsModal.svelte';
  import ShareModal from './components/modals/ShareModal.svelte';
  import PasswordPromptModal from './components/modals/PasswordPromptModal.svelte';
  import Welcome from './components/presentation/Welcome.svelte';
  import PromptSuggestions from './components/presentation/PromptSuggestions.svelte';
  import CustomLoading from './components/CustomLoading.svelte';
  import AuthButton from './components/AuthButton.svelte';
  import CodeArtifact from './components/shared/CodeArtifact.svelte';

  let currentView: 'main' | 'auth' = 'main';
  let isSharedView = false;
  let showPasswordModal = false;
  let passwordError: string | null = null;
  let passwordLoading = false;
  let shareIdForPassword: string | null = null;

  let authMode: 'signup' | 'login' = 'signup';
  let unauthenticatedSessionId = '';
  let abortController: AbortController | null = null;
  
  $: theme = $themeStore;
  $: isInitialState = $chatStore.isInitialState;

  let touchStartX = 0;
  let touchEndX = 0;
  let isMobile = false;

  function handleTouchStart(e: TouchEvent) {
    if (!isMobile || isSharedView) return;
    touchStartX = e.touches[0].clientX;
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isMobile || isSharedView) return;
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!isMobile || isSharedView) return;
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    if (swipeDistance > 0 && !$isSidebarExpanded) {
      isSidebarExpanded.set(true);
    } else if (swipeDistance < 0 && $isSidebarExpanded) {
      isSidebarExpanded.set(false);
    }
  }
  
  onMount(async () => {
    await authStore.initializeFromStorage();
    settingsStore.initialize();
    sessionUuidStore.initializeFromStorage();
    
    unauthenticatedSessionId = generateSessionId();
    document.documentElement.setAttribute('data-theme', $themeStore);

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    isMobile = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => isMobile = e.matches);

    await handlePathChange();
    initializeApp();
  });

  async function handlePathChange() {
    const path = window.location.pathname;
    const pathSegments = path.split('/').filter(Boolean);

    if (pathSegments[0] === 'share' && pathSegments[1]) {
      isSharedView = true;
      await loadSharedConversation(pathSegments[1]);
    } else {
      isSharedView = false;
      if (path.length > 1) {
        const uuid = path.substring(1);
        const sessionNumber = sessionUuidStore.getSessionNumberByUuid(uuid);
        if (sessionNumber) {
          await handleSelectHistory({ detail: { sessionNumber } });
        }
      }
    }
  }

  async function loadSharedConversation(shareId: string, password?: string) {
    chatStore.clearMessages();
    chatStore.setLoading(true);
    showPasswordModal = false;
    passwordError = null;
    passwordLoading = true;

    try {
      const history = await api.getSharedConversation(shareId, password);
      chatStore.loadSessionMessages(history);
    } catch (e: any) {
      if (e.status === 401) {
        showPasswordModal = true;
        shareIdForPassword = shareId;
        if (password) {
          passwordError = e.message || 'Password required or incorrect.';
        } else {
          passwordError = null;
        }
      } else {
        chatStore.addUserMessage("Sorry, this conversation could not be loaded.");
        chatStore.startAIResponse("Error", 'default');
        chatStore.updateStreamingMessage($chatStore.currentStreamingId!, e.message || 'An unknown error occurred.');
        chatStore.finishStreaming($chatStore.currentStreamingId!);
      }
    } finally {
      chatStore.setLoading(false);
      passwordLoading = false;
    }
  }

  async function handlePasswordSubmit(password: string) {
    if (shareIdForPassword) {
      await loadSharedConversation(shareIdForPassword, password);
    }
  }
  
  $: if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  async function initializeApp() {
    if (isSharedView) return;
    try {
      if ($authStore.isAuthenticated) {
        await Promise.all([
          loadHistory(),
          analyticsStore.syncAnalytics(),
        ]);
        
        if ($sessionStore.sessions.length === 0) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
  
  async function loadHistory() {
    try {
      const history = await api.getHistory();
      historyStore.setHistory(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }
  
  async function createNewSession() {
    try {
      const result = await api.createSession();
      sessionStore.addSession(result.session_number);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }
  
  function handleAuthClick() {
    authMode = $authStore.isSignedUp ? 'login' : 'signup';
    currentView = 'auth';
  }
  
  function handleAuthBack() {
    currentView = 'main';
  }
  
  function handleAuthSuccess() {
    currentView = 'main';
    if ($authStore.isAuthenticated) {
      initializeApp();
    }
  }
  
  async function handleNewChat() {
    isSharedView = false;
    history.pushState({}, '', '/');
    chatStore.clearMessages();
    chatStore.setCreatingNewConversation(true);
    
    if ($authStore.isAuthenticated) {
      await createNewSession();
    } else {
      unauthenticatedSessionId = generateSessionId();
    }
    chatStore.setCreatingNewConversation(false);
  }
  
  async function handleSelectHistory(event: CustomEvent<{ sessionNumber: number }>) {
    isSharedView = false;
    const { sessionNumber } = event.detail;
    
    try {
      sessionStore.setCurrentSession(sessionNumber);
      const messages = await api.getSessionHistory(sessionNumber);
      chatStore.loadSessionMessages(messages);

      const uuid = sessionUuidStore.getUuidBySessionNumber(sessionNumber);
      if (uuid) {
        history.pushState({}, '', `/${uuid}`);
      } else {
        history.pushState({}, '', '/');
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  }
  
  function handleLogout() {
    authStore.logout();
    chatStore.clearMessages();
    historyStore.setHistory([]);
    unauthenticatedSessionId = generateSessionId();
  }

async function pollSearchWebUrls(messageId: string, sessionNumber: number) {
  let pollCount = 0;
  const maxPolls = 120;
  const pollInterval = setInterval(async () => {
    try {
      pollCount++;
      const response = await api.getSearchWebUrls(sessionNumber, true);
      
      if (response && response.calls && Array.isArray(response.calls)) {
        const currentMessage = $chatStore.messages.find(m => m.id === messageId);

        if (currentMessage && currentMessage.toolCalls) {
          // Match backend calls to frontend tool calls by query
          response.calls.forEach((backendCall: any) => {
            if (backendCall && backendCall.urls && Array.isArray(backendCall.urls)) {
              // Find the tool call with matching query
              const toolCallIndex = currentMessage.toolCalls.findIndex(
                tc => tc.query === backendCall.query
              );
              
              if (toolCallIndex >= 0) {
                chatStore.updateToolCallUrls(messageId, toolCallIndex, backendCall.urls);
              }
            }
          });
        }
      }
      
      // Stop polling if message is no longer streaming
      const currentMessage = $chatStore.messages.find(m => m.id === messageId);
      if (!currentMessage?.isStreaming || pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    } catch (error) {
      // Silently continue - backend might not have data yet
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
      } 
    }
  }, 1000);
  
  return pollInterval;
}
  
async function submitPrompt(message: string, reason: 'default' | 'reason' | 'code' = 'default') {
    abortController = new AbortController();
    
    const model = reason === 'code' ? 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8' : reason === 'reason' ? 'Reasoning' : 'Default';
    const messageId = chatStore.startAIResponse(model, reason);

    // Start polling for search URLs if authenticated...
    let searchPollInterval: any = null;
    if ($authStore.isAuthenticated && $sessionStore.currentSession) {
      searchPollInterval = await pollSearchWebUrls(messageId, $sessionStore.currentSession);
    }

    let accumulatedContent = '';
    let firstTokenReceived = false;
    let streamEnded = false;
    let streamProcessor: StreamProcessor | null = null;

    let jsonBuffer = '';
    let isParsingJson = false;

    if (reason === 'code') {
      streamProcessor = new StreamProcessor();
      let currentArtifactFileIndex = -1; // Track which file is currently in artifact

      streamProcessor.setCallbacks({
        onFileStart: (fileIndex) => {
          chatStore.addFileToCodeMessage(messageId, fileIndex);
        },
        onTextChunk: (chunk) => chatStore.appendCodeModeText(messageId, chunk),
        onFileNameChunk: (chunk, fileIndex) => chatStore.appendCodeModeFileName(messageId, fileIndex, chunk),
        onFileVersionChunk: (chunk, fileIndex) => chatStore.appendCodeModeFileVersion(messageId, fileIndex, chunk),
        onFileCodeChunk: (chunk, fileIndex) => {
          // Check if we need to open artifact for a new file
          if (currentArtifactFileIndex !== fileIndex) {
            const message = $chatStore.messages.find(m => m.id === messageId);
            const fileName = message?.codeModeContent?.Files[fileIndex]?.FileName || `file-${fileIndex}`;
            const fileVersion = message?.codeModeContent?.Files[fileIndex]?.FileVersion;
            artifactStore.open(fileName, '', true, fileVersion);
            currentArtifactFileIndex = fileIndex;
          }
          artifactStore.appendCode(chunk);
          chatStore.appendCodeModeFileCode(messageId, fileIndex, chunk);
        },
        onFileTextChunk: (chunk, fileIndex) => chatStore.appendCodeModeFileText(messageId, fileIndex, chunk),
        onConclusionChunk: (chunk) => chatStore.appendCodeModeConclusion(messageId, chunk),
        onToolCall: (toolData, fileIndex) => {  // NEW CALLBACK
          chatStore.addToolCall(messageId, {
            name: toolData.name,
            query: toolData.query,
            position: toolData.position,
            fileIndex: fileIndex
          });
        },
        onComplete: () => {
          artifactStore.finishStreaming();
        }
      });
    }

    const onData = (data: { token: string, trace: boolean }) => {
      if (streamEnded) return;
      if (!firstTokenReceived) {
        chatStore.setLoading(false);
        firstTokenReceived = true;
      }
      if (streamProcessor) {
        streamProcessor.process(data.token);
        return;
      }

      let chunk = data.token;

      // State machine for detecting '{"tool_call":'
      if (!isParsingJson) {
        jsonBuffer += chunk;
        
        // Check if we have the complete tool call pattern
        const toolCallPattern = '{"tool_call":';
        const toolCallIndex = jsonBuffer.indexOf(toolCallPattern);
        
        if (toolCallIndex !== -1) {
          // Found the start of a tool call
          const textBeforeToolCall = jsonBuffer.substring(0, toolCallIndex);
          accumulatedContent += textBeforeToolCall;
          
          // Start parsing the JSON object
          isParsingJson = true;
          jsonBuffer = jsonBuffer.substring(toolCallIndex); // Keep from '{"tool_call":' onwards
        } else if (jsonBuffer.length > toolCallPattern.length) {
          // We've accumulated enough to know there's no tool call starting here
          // Keep only the last few chars in case pattern spans chunks
          const keepLength = toolCallPattern.length - 1;
          const releaseContent = jsonBuffer.substring(0, jsonBuffer.length - keepLength);
          accumulatedContent += releaseContent;
          jsonBuffer = jsonBuffer.substring(jsonBuffer.length - keepLength);
        }
      } else {
        // We're parsing a potential JSON object
        jsonBuffer += chunk;
        
        try {
          const parsed = JSON.parse(jsonBuffer);
          if (parsed && parsed.tool_call === 'search_web' && parsed.query) {
            chatStore.addToolCall(messageId, { name: parsed.tool_call, query: parsed.query });
            accumulatedContent += '<--tool-call-->';
            isParsingJson = false;
            jsonBuffer = '';
          }
        } catch (e) {
          // JSON not complete yet, continue accumulating
          // Safety: if buffer gets too large, it's not a tool call
          if (jsonBuffer.length > 500) {
            accumulatedContent += jsonBuffer;
            jsonBuffer = '';
            isParsingJson = false;
          }
        }
      }

      chatStore.updateStreamingMessage(messageId, accumulatedContent);
    };

    const onEnd = async () => {
      if (streamEnded) return;
      streamEnded = true;

      // Stop polling
      if (searchPollInterval) {
        clearInterval(searchPollInterval);
      }

      streamProcessor?.close();

      // CRITICAL FIX: Flush any remaining content in jsonBuffer
      if (jsonBuffer.length > 0) {
        accumulatedContent += jsonBuffer;
        jsonBuffer = '';
        isParsingJson = false;
      }

      const tokenCount = accumulatedContent.split(/\s+/).filter(Boolean).length;
      chatStore.updateStreamingMessage(messageId, accumulatedContent);
      chatStore.finishStreaming(messageId, tokenCount);
      
      analyticsStore.addTokenUsage(model, message.split(/\s+/).filter(Boolean).length, tokenCount);

      if ($authStore.isAuthenticated) {
        await loadHistory();
      }
      abortController = null;
    };

    const onError = (error: Error) => {
      console.error('Chat error:', error);
      const errorMessage = (error as any).status === 429 
        ? "You have hit the limit. Please sign in to continue!"
        : "Sorry, I encountered an error. Please try again.";
      
      chatStore.updateStreamingMessage(messageId, errorMessage);
      chatStore.finishStreaming(messageId);
      if (reason === 'code') {
        artifactStore.close();
      }
      abortController = null;
    };

    try {
      const sessionId = $authStore.isAuthenticated 
        ? $sessionStore.currentSession?.toString() || ''
        : unauthenticatedSessionId;
      
      await api.sendMessage(
        sessionId, 
        message, 
        reason, 
        abortController.signal,
        onData,
        onEnd,
        onError
      );
      onEnd();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        chatStore.interruptStreaming(messageId);
        chatStore.setLoading(false);
        if (reason === 'code') {
          artifactStore.close();
        }
        abortController = null;
      } else {
        onError(error);
      }
    }
  }

  async function handleChatSubmit(event: CustomEvent<{ message: string; reason: 'default' | 'reason' | 'code' }>) {
    if ($chatStore.isInitialState && $sessionStore.currentSession) {
      const uuid = crypto.randomUUID();
      sessionUuidStore.setSessionUuid($sessionStore.currentSession, uuid);
      history.pushState({}, '', `/${uuid}`);
    }
    const { message, reason } = event.detail;

    // Combine message with file data for UI display
    const files = $fileStore.files;
    let userContent = message;

    if (files.length > 0 && files.every(f => f.uploadStatus === 'success')) {
      const fileMetadata = files.map(f => ({
        id: f.storedName, // Use the unique stored name for the ID
        original_name: f.originalName,
        b2_key: f.storedName,
        size: f.size,
        type: f.type,
        is_image: f.isImage,
        uploaded_at: new Date().toISOString(), // Add current timestamp
      }));
      userContent = JSON.stringify({
        prompt: message,
        files: fileMetadata
      });
    }

    chatStore.addUserMessage(userContent);
    
    // Submit only the text prompt to the backend
    await submitPrompt(message, reason);

    // Clear files after they have been associated with a message
    if (files.length > 0) {
      fileStore.clearFiles();
    }
  }

  async function handleWelcomePrompt(event: CustomEvent<string>) {
    const prompt = event.detail;
    chatStore.addUserMessage(prompt);
    await submitPrompt(prompt);
  }

  async function handleSuggestionSelect(event: CustomEvent<{ prompt: string }>) {
    const { prompt } = event.detail;
    chatStore.addUserMessage(prompt);
    await submitPrompt(prompt);
  }

  async function handleRegenerate(event: CustomEvent<{ messageId: string }>) {
    const { messageId } = event.detail;
    const userPrompt = chatStore.regenerateAIResponse(messageId);

    if (userPrompt) {
      await submitPrompt(userPrompt);
    }
  }

  function handleInterrupt() {
    if (abortController) {
      abortController.abort();
    }
  }

  function toggleSidebar() {
    isSidebarExpanded.update(n => !n);
  }

  const artifactLayoutStore = derived(
    [artifactStore, isSidebarExpanded],
    ([$artifactStore, $isSidebarExpanded]) => ({
      artifactOpen: $artifactStore.show,
      sidebarExpanded: $isSidebarExpanded
    })
  );
</script>

{#if currentView === 'auth'}
  <Auth initialMode={authMode} on:back={handleAuthBack} on:success={handleAuthSuccess} />
{:else}
  <main class="app" class:sidebar-expanded={$isSidebarExpanded}>
    <Sidebar 
      disabled={isSharedView}
      on:newChat={handleNewChat}
      on:selectHistory={handleSelectHistory}
      on:logout={handleLogout}
    />
    
    <div 
      class="main-content"
      class:initial-state={isInitialState}
      class:artifact-open={$artifactLayoutStore.artifactOpen}
      class:sidebar-expanded={$artifactLayoutStore.sidebarExpanded}
      on:touchstart={handleTouchStart}
      on:touchmove={handleTouchMove}
      on:touchend={handleTouchEnd}
    >
      {#if isInitialState && !isSharedView}
        <div class="initial-state-container">
          <Welcome on:prompt={handleWelcomePrompt} />
          <div class="initial-chat-input-wrapper">
            <ChatInput on:submit={handleChatSubmit} on:interrupt={handleInterrupt} />
          </div>
          <PromptSuggestions on:select={handleSuggestionSelect} />
          <div class="disclaimer">
            <p>Deepthinks can make mistakes. Ask to clarify.</p>
          </div>
        </div>
      {:else}

        <ChatContainer isSharedView={isSharedView} on:regenerate={handleRegenerate} />
        <ChatInput disabled={isSharedView} on:submit={handleChatSubmit} on:interrupt={handleInterrupt} />
      {/if}
    </div>

    {#if $chatStore.isCreatingNewConversation}
      <div class="loading-overlay">
        <CustomLoading />
      </div>
    {/if}
    
    <AuthButton onAuthClick={handleAuthClick} />

    <CodeArtifact 
      show={$artifactStore.show}
      filename={$artifactStore.filename}
      code={$artifactStore.code}
      isStreaming={$artifactStore.isStreaming}
      version={$artifactStore.version}
      on:close={() => artifactStore.close()}
    />

    {#if $settingsStore.isCustomizeModalOpen}
      <CustomizeBehaviorModal />
    {/if}
    {#if $settingsStore.isSettingsModalOpen}
      <SettingsModal />
    {/if}
    {#if $aboutModalStore.isOpen}
      <AboutModal isOpen={$aboutModalStore.isOpen} on:close={() => aboutModalStore.closeModal()} />
    {/if}
    {#if $analyticsStore.isAnalyticsModalOpen}
      <AnalyticsModal />
    {/if}
    {#if $shareStore.isShareModalOpen}
      <ShareModal />
    {/if}
    {#if showPasswordModal}
      <PasswordPromptModal 
        onPasswordSubmit={handlePasswordSubmit}
        error={passwordError}
        isLoading={passwordLoading}
      />
    {/if}
    {#if $isSidebarExpanded && isMobile}
      <div class="mobile-sidebar-backdrop" on:click={toggleSidebar} />
    {/if}
  </main>
{/if}

<style>
  .initial-state-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
    position: relative;
  }

  .initial-chat-input-wrapper {
    width: 100%;
    max-width: 1152px; /* 768px * 1.5 */
  }

  .disclaimer {
    position: absolute;
    bottom: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  :global(:root) {
    --sidebar-collapsed-width: 60px;
    --sidebar-expanded-width: 300px;
    
    /* Unified Light Theme Variables */
    --background-color: #ffffff;      /* Main background */
    --surface-color: #f8f9fa;         /* Card backgrounds, secondary surfaces */
    --hover-color: #f1f3f4;           /* Hover states */
    --border-color: #e1e5e9;          /* Borders and dividers */
    --text-color: #1a1a1a;             /* Primary text */
    --text-muted: #6b7280;             /* Secondary text */
    --primary-color: #667eea;         /* Main brand color */
    --primary-hover: #5a6fd8;         /* Brand color on hover */
    --primary-color-translucent: rgba(102, 126, 234, 0.1);
  }
  
  :global([data-theme="dark"]) {
    /* Unified Dark Theme Variables */
    --background-color: #1a1a1a;
    --surface-color: #2d2d2d;
    --hover-color: #3a3a3a;
    --border-color: #404040;
    --text-color: #ffffff;
    --text-muted: #a0a0a0;
    --primary-color: #667eea;
    --primary-hover: #5a6fd8;
    --primary-color-translucent: rgba(102, 126, 234, 0.2);
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--background-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  .app {
    min-height: 100vh;
    background: var(--background-color);
    --current-sidebar-width: var(--sidebar-collapsed-width);
  }
  
  .app.sidebar-expanded {
    --current-sidebar-width: var(--sidebar-expanded-width);
  }
  
  .main-content {
    position: relative;
    margin-left: var(--current-sidebar-width);
    width: calc(100% - var(--current-sidebar-width));
    height: 100vh;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .main-content.initial-state {
    justify-content: center;
  }
  
  :global(button) {
    font-family: inherit;
  }
  
  :global(input), :global(textarea) {
    font-family: inherit;
  }
  
  /* Smooth scrolling */
  :global(html) {
    scroll-behavior: smooth;
  }
  
  /* Focus styles */
  :global(:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  
  /* Selection styles */
  :global(::selection) {
    background: rgba(102, 126, 234, 0.2);
  }

  .mobile-sidebar-backdrop {
    display: none;
  }

  .main-content.artifact-open {
    width: calc(100% - var(--current-sidebar-width) - 45%);
  }

  .main-content.artifact-open.sidebar-expanded {
    width: calc(100% - var(--current-sidebar-width) - 40%);

    
  }

  @media (max-width: 768px) {
    .main-content.artifact-open {
      width: 0; /* Hide chat completely on mobile when artifact is open */
      overflow: hidden;
    }
  }

  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
      width: 100%;
      transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      touch-action: pan-y; /* Allow vertical scroll, but handle horizontal swipe */
      overflow: hidden;
    }

    .app.sidebar-expanded .main-content {
      /* When sidebar is open, we can add a slight shift or effect if desired */
      /* For now, just ensure it's not interactive */
      pointer-events: none;
      touch-action: none;
    }
	.app.sidebar-expanded {
      overflow: hidden;
    }

    .mobile-sidebar-backdrop {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 100;
    }
  }
</style>