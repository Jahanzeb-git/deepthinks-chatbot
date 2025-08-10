<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from './stores/auth';
  import { sessionStore } from './stores/session';
  import { themeStore } from './stores/theme';
  import { chatStore } from './stores/chat';
  import { historyStore } from './stores/history';
  import { settingsStore } from './stores/settings';
  import { isSidebarExpanded } from './stores/sidebar';
  import { aboutModalStore } from './stores/about';
  import { analyticsStore } from './stores/analytics';
  import { api } from './lib/api';
  import { generateSessionId } from './lib/utils';
  
  import LoadingScreen from './components/LoadingScreen.svelte';
  import AuthButton from './components/AuthButton.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import ChatContainer from './components/ChatContainer.svelte';
  import ChatInput from './components/ChatInput.svelte';
  import Auth from './routes/Auth.svelte';
  import CustomizeBehaviorModal from './components/modals/CustomizeBehaviorModal.svelte';
  import SettingsModal from './components/modals/SettingsModal.svelte';
  import AboutModal from './components/modals/AboutModal.svelte';
  import AnalyticsModal from './components/modals/AnalyticsModal.svelte';
  import Welcome from './components/presentation/Welcome.svelte';
  import PromptSuggestions from './components/presentation/PromptSuggestions.svelte';
  import CustomLoading from './components/CustomLoading.svelte';
  
  let currentView: 'loading' | 'main' | 'auth' = 'loading';
  let authMode: 'signup' | 'login' = 'signup';
  let unauthenticatedSessionId = '';
  let abortController: AbortController | null = null;
  
  $: theme = $themeStore;
  $: isInitialState = $chatStore.isInitialState;

  let touchStartX = 0;
  let touchEndX = 0;
  let isMobile = false;

  function handleTouchStart(e: TouchEvent) {
    if (!isMobile) return;
    touchStartX = e.touches[0].clientX;
    touchEndX = e.touches[0].clientX; // Reset on new touch
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isMobile) return;
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!isMobile) return;
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    if (Math.abs(swipeDistance) < minSwipeDistance) {
      return;
    }

    if (swipeDistance > 0 && !$isSidebarExpanded) {
      // Swipe right to open
      isSidebarExpanded.set(true);
    } else if (swipeDistance < 0 && $isSidebarExpanded) {
      // Swipe left to close
      isSidebarExpanded.set(false);
    }
  }
  
  onMount(async () => {
    authStore.initializeFromStorage();
    settingsStore.initialize();
    
    // Generate session ID for unauthenticated users
    unauthenticatedSessionId = generateSessionId();
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', $themeStore);

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    isMobile = mediaQuery.matches;
    const mediaQueryListener = (e: MediaQueryListEvent) => isMobile = e.matches;
    mediaQuery.addEventListener('change', mediaQueryListener);

    return () => {
      mediaQuery.removeEventListener('change', mediaQueryListener);
    }
  });
  
  // Watch theme changes
  $: if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  function handleLoadingComplete() {
    currentView = 'main';
    initializeApp();
  }
  
  async function initializeApp() {
    try {
      if ($authStore.isAuthenticated) {
        // Load settings and history for authenticated users
        await Promise.all([
          loadHistory(),
          analyticsStore.syncAnalytics(),
        ]);
        
        // Create initial session if none exists
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
    // Only initialize app if user is actually authenticated (logged in)
    if ($authStore.isAuthenticated) {
      initializeApp();
    }
  }
  
  async function handleNewChat() {
    chatStore.clearMessages();
    chatStore.setCreatingNewConversation(true);
    
    if ($authStore.isAuthenticated) {
      await createNewSession();
    } else {
      // Generate new session ID for unauthenticated users
      unauthenticatedSessionId = generateSessionId();
    }
    chatStore.setCreatingNewConversation(false);
  }
  
  async function handleSelectHistory(event: CustomEvent<{ sessionNumber: number }>) {
    const { sessionNumber } = event.detail;
    
    try {
      // Set current session
      sessionStore.setCurrentSession(sessionNumber);
      
      // Load session messages
      const messages = await api.getSessionHistory(sessionNumber);
      chatStore.loadSessionMessages(messages);
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
  
  async function submitPrompt(message: string) {
    abortController = new AbortController();
    
    const model = $settingsStore.settings.reasoning ? 'Reasoning' : 'Default';
    const messageId = chatStore.startAIResponse(model);
    let accumulatedContent = '';
    let firstTokenReceived = false;
    let streamEnded = false;

    const onData = (data: { token: string, trace: boolean }) => {
      if (!firstTokenReceived) {
        chatStore.setLoading(false);
        firstTokenReceived = true;
      }
      accumulatedContent += data.token;
      chatStore.updateStreamingMessage(messageId, accumulatedContent);
    };

    const onEnd = async () => {
      if (streamEnded) return;
      streamEnded = true;

      const tokenCount = accumulatedContent.split(/\s+/).filter(Boolean).length;
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
      abortController = null;
    };

    try {
      const sessionId = $authStore.isAuthenticated 
        ? $sessionStore.currentSession?.toString() || ''
        : unauthenticatedSessionId;
      
      await api.sendMessage(
        sessionId, 
        message, 
        $settingsStore.settings.reasoning, 
        abortController.signal,
        onData,
        onEnd,
        onError
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        chatStore.interruptStreaming(messageId);
        chatStore.setLoading(false); // Explicitly set loading to false
        abortController = null;
      } else {
        onError(error);
      }
    }
  }

  async function handleChatSubmit(event: CustomEvent<{ message: string }>) {
    const { message } = event.detail;
    chatStore.addUserMessage(message);
    await submitPrompt(message);
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
</script>

{#if currentView === 'loading'}
  <LoadingScreen onLoadingComplete={handleLoadingComplete} />
{:else if currentView === 'auth'}
  <Auth initialMode={authMode} on:back={handleAuthBack} on:success={handleAuthSuccess} />
{:else}
  <main class="app" class:sidebar-expanded={$isSidebarExpanded}>
    <Sidebar 
      on:newChat={handleNewChat}
      on:selectHistory={handleSelectHistory}
      on:logout={handleLogout}
    />
    
    <div 
      class="main-content"
      class:initial-state={isInitialState}
      on:touchstart={handleTouchStart}
      on:touchmove={handleTouchMove}
      on:touchend={handleTouchEnd}
    >
      {#if isInitialState}
        <div class="initial-state-container">
          <Welcome on:prompt={handleWelcomePrompt} />
          <ChatInput on:submit={handleChatSubmit} on:interrupt={handleInterrupt} />
          <PromptSuggestions on:select={handleSuggestionSelect} />
        </div>
      {:else}
        <ChatContainer on:regenerate={handleRegenerate} />
        <ChatInput on:submit={handleChatSubmit} on:interrupt={handleInterrupt} />
      {/if}
    </div>

    {#if $chatStore.isCreatingNewConversation}
      <div class="loading-overlay">
        <CustomLoading />
      </div>
    {/if}
    
    <AuthButton onAuthClick={handleAuthClick} />

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
