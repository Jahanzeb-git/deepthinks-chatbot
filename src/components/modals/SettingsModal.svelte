<script lang="ts">
  import { settingsStore, type UserSettings } from '../../stores/settings';
  import { themeStore } from '../../stores/theme'; // USE THE REAL THEME STORE
  import { authStore } from '../../stores/auth'; // IMPORT THE AUTH STORE
  import { analyticsStore } from '../../stores/analytics';
  import Modal from './Modal.svelte';
  import Toggle from '../shared/Toggle.svelte';
  import { User, Bell, Database, KeyRound, BrainCircuit, X, AlertTriangle, Check, Trash2, Settings, ChevronRight, Shield, Sparkles, ChevronLeft, Info, FileText, FileCode, FileImage, Download } from 'lucide-svelte';
  import DataControlModal from './DataControlModal.svelte';
  import { get } from 'svelte/store';
  import { tick, onMount } from 'svelte';
  import { api } from '../../lib/api'; // Import the API utility
	

  // Use a local variable for the input to avoid debouncing issues
  let nameInputValue: string = '';
  let isNameSaving = false;
  let nameInputTimeout: number;
  
  let showDeleteChatsModal = false;
  let showDeleteAccountModal = false;
  let isDataModalOpen = false;
  let isDeletingAccount = false;
  let showDeleteApiKeyConfirmation = false; // New state for confirmation dialog

  // Together AI API Key State
  let togetherApiKeyInput: string = '';
  let maskedTogetherApiKey: string | null = null;
  let isVerifyingTogetherApiKey: boolean = false;
  let togetherApiKeyFeedback: string | null = null;
  let hasTogetherApiKey: boolean = false;
  let apiKeyStatusMessage: string = 'App specific API key is in use.'; // New state for status message

  // Files Management State
  let filesData: any[] = [];
  let isLoadingFiles = false;
  let filesError: string | null = null;
  let selectedFiles: string[] = [];
  let showDeleteFilesConfirmation = false;
  let isDeletingFiles = false;

  const sections = {
    General: { icon: User, description: 'Personalization & appearance' },
    Account: { icon: KeyRound, description: 'Profile & security' },
    Files: { icon: Database, description: 'Manage uploaded files' },
    'Data Control': { icon: Database, description: 'Privacy & data management' },
  };
  const sectionKeys = Object.keys(sections);
  let activeTab = 'General';

  // Swipe navigation logic
  let touchStartX = 0;
  let touchEndX = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchEndX = e.touches[0].clientX; // Reset on new touch
  }

  function handleTouchMove(e: TouchEvent) {
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    if (Math.abs(swipeDistance) < minSwipeDistance) {
      return;
    }

    if (swipeDistance < 0) {
      // Swipe left for next
      nextTab();
    } else {
      // Swipe right for previous
      prevTab();
    }
  }

  function nextTab() {
    const currentIndex = sectionKeys.indexOf(activeTab);
    if (currentIndex < sectionKeys.length - 1) {
      activeTab = sectionKeys[currentIndex + 1];
    }
  }

  function prevTab() {
    const currentIndex = sectionKeys.indexOf(activeTab);
    if (currentIndex > 0) {
      activeTab = sectionKeys[currentIndex - 1];
    }
  }
  
  settingsStore.subscribe(store => {
    if (!isNameSaving && document.activeElement?.id !== 'what_we_call_you_input') {
      nameInputValue = store.settings.what_we_call_you || '';
    }
  });

  // THIS IS THE CORRECT WAY TO HANDLE THEME
  function handleThemeChange(event: CustomEvent<boolean>) {
    const newTheme = event.detail ? 'dark' : 'light';
    themeStore.set(newTheme);
    // Also persist this to the backend via the settings store
    settingsStore.updateSettings({ theme: newTheme });
  }

  // Debounced input handler for the name
  function handleNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    nameInputValue = target.value;
    
    clearTimeout(nameInputTimeout);
    nameInputTimeout = setTimeout(async () => {
      const currentNameInStore = get(settingsStore).settings.what_we_call_you || '';
      if (nameInputValue.trim() !== currentNameInStore) {
        isNameSaving = true;
        await settingsStore.updateSettings({ what_we_call_you: nameInputValue.trim() });
        isNameSaving = false;
      }
    }, 1000);
  }

  function confirmDeleteChats() {
    console.log("Deleting all chats...");
    showDeleteChatsModal = false;
  }

  async function confirmDeleteAccount() {
    if (isDeletingAccount) return;
    isDeletingAccount = true;
    try {
      await authStore.deleteAccount();
      // The auth store will handle clearing local storage and logging out.
      // We just need to close the modals.
      showDeleteAccountModal = false;
      settingsStore.closeSettingsModal();
    } catch (error) {
      console.error("Failed to delete account:", error);
      // Optionally, show an error message to the user here
    } finally {
      isDeletingAccount = false;
    }
  }

  function switchTab(tab: string) {
    activeTab = tab;
  }

  async function fetchMaskedTogetherApiKey() {
    togetherApiKeyFeedback = null;
    try {
      const token = localStorage.getItem('deepthinks_token');
      if (!token) {
        apiKeyStatusMessage = 'App specific API key is in use.';
        maskedTogetherApiKey = null;
        hasTogetherApiKey = false;
        authStore.setActiveApiKeyIdentifier('_default');
        return;
      }
      const response = await api.getUserKey();
      if (response.api_key_masked) {
        maskedTogetherApiKey = response.api_key_masked;
        hasTogetherApiKey = true;
        apiKeyStatusMessage = 'Your Personal API key is in use.';
        authStore.setActiveApiKeyIdentifier(response.api_key_masked);
      } else {
        maskedTogetherApiKey = null;
        hasTogetherApiKey = false;
        apiKeyStatusMessage = 'App specific API key is in use.';
        authStore.setActiveApiKeyIdentifier('_default');
      }
    } catch (error: any) {
      console.error('Failed to fetch masked API key:', error);
      togetherApiKeyFeedback = `Error: ${error.message || 'Could not fetch API key status.'}`;
      maskedTogetherApiKey = null;
      hasTogetherApiKey = false;
      apiKeyStatusMessage = 'App specific API key is in use.'; // Fallback to app key on error
      authStore.setActiveApiKeyIdentifier('_default');
    }
  }

  async function handleAddTogetherApiKey() {
    togetherApiKeyFeedback = null;
    isVerifyingTogetherApiKey = true;
    try {
      const token = localStorage.getItem('deepthinks_token');
      if (!token) {
        togetherApiKeyFeedback = 'Error: Authentication token missing.';
        return;
      }
      const response = await api.postUserKey(togetherApiKeyInput);
      togetherApiKeyFeedback = response.message;
      if (response.message === "Together API key stored successfully") {
        analyticsStore.resetAnalytics();
        await fetchMaskedTogetherApiKey(); 
        analyticsStore.syncAnalytics();
        togetherApiKeyInput = ''; // Clear input on success
      } else {
        togetherApiKeyFeedback = `Error: ${response.message}`;
      }
    } catch (error: any) {
      console.error('Failed to add API key:', error);
      togetherApiKeyFeedback = `Error: ${error.message || 'An unknown error occurred.'}`;
    } finally {
      isVerifyingTogetherApiKey = false;
    }
  }

  async function confirmRemoveTogetherApiKey() {
    showDeleteApiKeyConfirmation = true;
  }

  async function handleRemoveTogetherApiKey() {
    showDeleteApiKeyConfirmation = false;
    togetherApiKeyFeedback = null;
    isVerifyingTogetherApiKey = true; // Use this to disable buttons during removal too
    try {
      const token = localStorage.getItem('deepthinks_token');
      if (!token) {
        togetherApiKeyFeedback = 'Error: Authentication token missing.';
        return;
      }
      const response = await api.deleteUserKey();
      togetherApiKeyFeedback = response.message;
      if (response.message === "Together API key removed successfully") {
        maskedTogetherApiKey = null;
        hasTogetherApiKey = false;
        apiKeyStatusMessage = 'App specific API key is in use.';
        analyticsStore.resetAnalytics();
        authStore.setActiveApiKeyIdentifier('_default');
        analyticsStore.syncAnalytics();
      } else {
        togetherApiKeyFeedback = `Error: ${response.message}`;
      }
    } catch (error: any) {
      console.error('Failed to remove API key:', error);
      togetherApiKeyFeedback = `Error: ${error.message || 'An unknown error occurred.'}`;
    } finally {
      isVerifyingTogetherApiKey = false;
    }
  }

  async function loadFiles() {
  	isLoadingFiles = true;
  	filesError = null;
  	try {
    	const response = await api.listFiles();
    	filesData = response.files || [];
  	} catch (error: any) {
    	console.error('Failed to load files:', error);
    	filesError = error.message || 'Failed to load files';
  	} finally {
    	isLoadingFiles = false;
  	}
	}

	function toggleFileSelection(storedName: string) {
  	if (selectedFiles.includes(storedName)) {
    	selectedFiles = selectedFiles.filter(f => f !== storedName);
  	} else {
    	selectedFiles = [...selectedFiles, storedName];
  	}
	}

	function selectAllFiles() {
  	selectedFiles = filesData.map(f => f.b2_key);
	}

	function deselectAllFiles() {
  	selectedFiles = [];
	}

	async function confirmDeleteFiles(deleteAll: boolean = false) {
  	isDeletingFiles = true;
  	try {
    	if (deleteAll) {
      	await api.deleteFiles(undefined, true);
    	} else {
      	await api.deleteFiles(selectedFiles);
    	}
    	selectedFiles = [];
    	await loadFiles();
    	showDeleteFilesConfirmation = false;
  	} catch (error: any) {
    	console.error('Failed to delete files:', error);
    	filesError = error.message || 'Failed to delete files';
  	} finally {
    	isDeletingFiles = false;
  	}
	}

	function formatFileDate(dateString: string): string {
  	const date = new Date(dateString);
  	return date.toLocaleDateString('en-US', { 
    	year: 'numeric', 
    	month: 'short', 
    	day: 'numeric' 
  	});
	}

	function getFileIcon(mimeType: string, fileName: string) {
  	const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  	if (mimeType.startsWith('image/')) return { icon: FileImage, color: '#10b981' };
  
  	const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs'];
  	if (codeExts.includes(ext)) return { icon: FileCode, color: '#3b82f6' };
  
  	return { icon: FileText, color: '#8b5cf6' };
	}

	function formatBytes(bytes: number): string {
  	if (bytes === 0) return '0 B';
  	const k = 1024;
  	const sizes = ['B', 'KB', 'MB', 'GB'];
  	const i = Math.floor(Math.log(bytes) / Math.log(k));
  	return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	}

  onMount(async () => {
  	await fetchMaskedTogetherApiKey();
  	analyticsStore.syncAnalytics();
  	if (activeTab === 'Files') {
    	await loadFiles();
  	}
	});
	$: if (activeTab === 'Files' && $settingsStore.isSettingsModalOpen && filesData.length === 0 && !isLoadingFiles) {
  	loadFiles();
	}
</script>

<Modal
  isOpen={$settingsStore.isSettingsModalOpen}
  on:close={settingsStore.closeSettingsModal}
  title="Settings"
  modalClass="settings-modal"
>
  <div class="settings-container">
    <button class="close-button" on:click={settingsStore.closeSettingsModal}>
      <X size={24} />
    </button>

    <!-- Mobile Tab Selector -->
    <div class="mobile-tab-selector">
      <div class="mobile-header">
        <h3 class="mobile-title">{activeTab}</h3>
        <p class="mobile-subtitle">{sections[activeTab].description}</p>
      </div>
    </div>

    <div class="settings-layout" on:touchstart={handleTouchStart} on:touchmove={handleTouchMove} on:touchend={handleTouchEnd}>
      <!-- Desktop Sidebar -->
      <div class="desktop-sidebar">
        <div class="sidebar-header">
          <h3 class="sidebar-title">Settings</h3>
          <p class="sidebar-subtitle">Manage your preferences</p>
        </div>
        
        <nav class="sidebar-nav">
          {#each Object.entries(sections) as [sectionName, { icon, description }]}
            <button 
              class="sidebar-item"
              class:active={activeTab === sectionName}
              on:click={() => activeTab = sectionName}
            >
              <div class="sidebar-item-icon">
                <svelte:component this={icon} size={20} />
              </div>
              <div class="sidebar-item-content">
                <span class="sidebar-item-title">{sectionName}</span>
                <span class="sidebar-item-desc">{description}</span>
              </div>
              <div class="sidebar-chevron">
                <ChevronRight size={16} />
              </div>
            </button>
          {/each}
        </nav>
      </div>

      <!-- Main Content -->
      <main class="settings-main">
        <div class="settings-content">
          {#if activeTab === 'General'}
            <div class="settings-section">
              <div class="section-header">
                <button class="mobile-nav-btn prev" on:click={prevTab} class:visible={activeTab !== 'General'}>
                  <ChevronLeft size={24} />
                </button>
                <div class="header-content">
                  <h3 class="section-title">Personalization</h3>
                  <p class="section-desc">Customize your experience</p>
                </div>
                <button class="mobile-nav-btn next" on:click={nextTab} class:visible={activeTab !== 'Data Control'}>
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div class="settings-grid">
                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <User size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Preferred Name</h4>
                      <p class="setting-desc">This name will be used to address you in conversations</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <div class="input-wrapper">
                      <input 
                        id="what_we_call_you_input"
                        type="text" 
                        class="modern-input"
                        placeholder="How should we call you?"
                        bind:value={nameInputValue}
                        on:input={handleNameInput}
                        disabled={$settingsStore.isLoading}
                      />
                      {#if $settingsStore.isLoading && isNameSaving}
                        <div class="input-status saving">
                          <div class="spinner"></div>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <Sparkles size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Theme</h4>
                      <p class="setting-desc">Switch between light and dark mode for your comfort</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <div class="theme-selector">
                      <span class="theme-label" class:active={$themeStore === 'light'}>Light</span>
                      <Toggle 
                        checked={$themeStore === 'dark'} 
                        on:change={handleThemeChange}
                        disabled={$settingsStore.isLoading}
                      />
                      <span class="theme-label" class:active={$themeStore === 'dark'}>Dark</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {:else if activeTab === 'Files'}
            <div class="settings-section">
              <div class="section-header">
                <button class="mobile-nav-btn prev" on:click={prevTab} class:visible={activeTab !== 'General'}>
                  <ChevronLeft size={24} />
                </button>
                <div class="header-content">
                  <h3 class="section-title">File Management</h3>
                  <p class="section-desc">View and manage your uploaded files</p>
                </div>
                <button class="mobile-nav-btn next" on:click={nextTab} class:visible={activeTab !== 'Data Control'}>
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div class="settings-grid">
                <div class="setting-card full-width">
                  <div class="files-management">
                    {#if isLoadingFiles}
                      <div class="loading-state">
                        <div class="spinner"></div>
                        <span>Loading files...</span>
                      </div>
                    {:else if filesError}
                      <div class="error-state">
                        <AlertTriangle size={24} />
                        <span>{filesError}</span>
                        <button class="action-btn primary" on:click={loadFiles}>
                          Retry
                        </button>
                      </div>
                    {:else if filesData.length === 0}
                      <div class="empty-state">
                        <Database size={48} />
                        <h4>No files uploaded</h4>
                        <p>Upload files in your conversations to see them here</p>
                      </div>
                    {:else}
                      <div class="files-header">
                        <div class="files-count">
                          <span class="count-number">{filesData.length}</span>
                          <span class="count-label">file{filesData.length !== 1 ? 's' : ''}</span>
                          {#if selectedFiles.length > 0}
                            <span class="selected-count">({selectedFiles.length} selected)</span>
                          {/if}
                        </div>
                        <div class="files-actions">
                          {#if selectedFiles.length > 0}
                            <button class="action-btn secondary" on:click={deselectAllFiles}>
                              Deselect All
                            </button>
                            <button class="action-btn danger" on:click={() => showDeleteFilesConfirmation = true}>
                              <Trash2 size={16} />
                              Delete Selected
                            </button>
                          {:else}
                            <button class="action-btn secondary" on:click={selectAllFiles}>
                              Select All
                            </button>
                            <button class="action-btn danger" on:click={() => { selectedFiles = []; showDeleteFilesConfirmation = true; }}>
                              <Trash2 size={16} />
                              Delete All
                            </button>
                          {/if}
                        </div>
                      </div>
                      
                      <div class="files-list">
                        {#each filesData as file (file.id)}
                          {@const fileIconData = getFileIcon(file.mime_type, file.original_name)}
                          <div class="file-item" class:selected={selectedFiles.includes(file.b2_key)}>
                            <input 
                              type="checkbox" 
                              class="file-checkbox"
                              checked={selectedFiles.includes(file.b2_key)}
                              on:change={() => toggleFileSelection(file.b2_key)}
                            />
                            <div class="file-item-icon" style="background-color: {fileIconData.color}15; color: {fileIconData.color};">
                              <svelte:component this={fileIconData.icon} size={20} />
                            </div>
                            <div class="file-item-info">
                              <div class="file-item-name">{file.original_name}</div>
                              <div class="file-item-meta">
                                <span>{formatBytes(file.size)}</span>
                                <span>•</span>
                                <span>{formatFileDate(file.uploaded_at)}</span>
                                {#if file.session_number}
                                  <span>•</span>
                                  <span>Session {file.session_number}</span>
                                {/if}
                              </div>
                            </div>
                            <button 
                              class="file-item-delete"
                              on:click={() => {
                                selectedFiles = [file.b2_key];
                                showDeleteFilesConfirmation = true;
                              }}
                              title="Delete file"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
{:else if activeTab === 'Data Control'}
            <div class="settings-section">
              <div class="section-header">
                <button class="mobile-nav-btn prev" on:click={prevTab} class:visible={activeTab !== 'General'}>
                  <ChevronLeft size={24} />
                </button>
                <div class="header-content">
                  <h3 class="section-title">Privacy & Data</h3>
                  <p class="section-desc">Control how your data is used and stored</p>
                </div>
                <button class="mobile-nav-btn next" on:click={nextTab} class:visible={activeTab !== 'Data Control'}>
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div class="settings-grid">
                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <Shield size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Improve Model</h4>
                      <p class="setting-desc">Help improve our AI for all users with anonymized data</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <button class="action-btn primary" on:click={() => isDataModalOpen = true} disabled>
                      <Settings size={16} />
                      Manage
                    </button>
                  </div>
                </div>

                <div class="setting-card danger">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <Trash2 size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Delete Chats</h4>
                      <p class="setting-desc">Permanently delete all conversation history</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <button class="action-btn danger" on:click={() => showDeleteChatsModal = true}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {:else if activeTab === 'Account'}
            <div class="settings-section">
              <div class="section-header">
                <button class="mobile-nav-btn prev" on:click={prevTab} class:visible={activeTab !== 'General'}>
                  <ChevronLeft size={24} />
                </button>
                <div class="header-content">
                  <h3 class="section-title">Account Information</h3>
                  <p class="section-desc">Manage your account details and profile</p>
                </div>
                <button class="mobile-nav-btn next" on:click={nextTab} class:visible={activeTab !== 'Data Control'}>
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div class="settings-grid">
                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <User size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Username</h4>
                      <p class="setting-desc">Your unique identifier</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <div class="read-only-field">
                      <span class="field-value">{$settingsStore.settings.username || 'Loading...'}</span>
                    </div>
                  </div>
                </div>

                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <KeyRound size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Email Address</h4>
                      <p class="setting-desc">Primary contact email</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <div class="read-only-field">
                      <span class="field-value">{$settingsStore.settings.email || 'Loading...'}</span>
                    </div>
                  </div>
                </div>

                <div class="setting-card">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <KeyRound size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Together AI API Key</h4>
                      <p class="setting-desc">Add your personal Together AI API key for enhanced usage.</p>
                    </div>
                  </div>
                  <div class="setting-control full">
                    {#if hasTogetherApiKey}
                      <div class="read-only-field">
                        <span class="field-value">{maskedTogetherApiKey}</span>
                      </div>
                      <button 
                        class="action-btn danger"
                        on:click={confirmRemoveTogetherApiKey}
                        disabled={isVerifyingTogetherApiKey}
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    {:else}
                      <input 
                        type="password" 
                        class="modern-input"
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                        bind:value={togetherApiKeyInput}
                        disabled={isVerifyingTogetherApiKey}
                      />
                      <button 
                        class="action-btn primary"
                        on:click={handleAddTogetherApiKey}
                        disabled={isVerifyingTogetherApiKey || !togetherApiKeyInput.trim()}
                      >
                        {#if isVerifyingTogetherApiKey}
                          <div class="spinner small"></div>
                          Verifying...
                        {:else}
                          <Check size={16} />
                          Add
                        {/if}
                      </button>
                    {/if}
                  </div>
                  {#if togetherApiKeyFeedback}
                    <p class="api-feedback-message" class:error={togetherApiKeyFeedback.startsWith('Error:')}>
                      {togetherApiKeyFeedback}
                    </p>
                  {/if}
                  <div class="api-key-notes">
                    <p>To get API key navigate to <a href="https://together.ai" target="_blank" rel="noopener noreferrer">together.ai</a> and get API key, paste that key here.</p>
                    <p>Your key will be Securely stored in the system with Security algorithm.</p>
                  </div>
                  <div class="api-key-status-message">
                    <Info size={16} />
                    <span>{apiKeyStatusMessage}</span>
                  </div>
                </div>

                <div class="setting-card danger">
                  <div class="setting-header">
                    <div class="setting-icon">
                      <AlertTriangle size={20} />
                    </div>
                    <div class="setting-info">
                      <h4 class="setting-title">Delete Account</h4>
                      <p class="setting-desc">Permanently delete your account and all data</p>
                    </div>
                  </div>
                  <div class="setting-control">
                    <button class="action-btn danger" on:click={() => showDeleteAccountModal = true} disabled={isDeletingAccount}>
                      <AlertTriangle size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="footer-btn primary" on:click={settingsStore.closeSettingsModal}>
            <Check size={16} />
            Done
          </button>
        </div>
      </main>
    </div>
  </div>
</Modal>

<DataControlModal bind:isOpen={isDataModalOpen} />

{#if showDeleteChatsModal}
  <Modal isOpen={true} on:close={() => showDeleteChatsModal = false} title="Delete Chats">
    <div class="confirmation-modal">
      <div class="confirmation-header">
        <div class="confirmation-icon danger">
          <AlertTriangle size={48} />
        </div>
        <h2 class="confirmation-title">Delete All Chats?</h2>
        <p class="confirmation-desc">This will permanently delete all your conversation history. This action cannot be undone.</p>
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-btn secondary" on:click={() => showDeleteChatsModal = false}>
          Cancel
        </button>
        <button class="confirmation-btn danger" on:click={confirmDeleteChats}>
          <Trash2 size={16} />
          Delete Chats
        </button>
      </div>
    </div>
  </Modal>
{/if}

{#if showDeleteAccountModal}
  <Modal isOpen={true} on:close={() => showDeleteAccountModal = false} title="Delete Account">
    <div class="confirmation-modal">
      <div class="confirmation-header">
        <div class="confirmation-icon danger">
          <AlertTriangle size={48} />
        </div>
        <h2 class="confirmation-title">Delete Account?</h2>
        <p class="confirmation-desc">This will permanently delete your account and all associated data. This action cannot be undone.</p>
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-btn secondary" on:click={() => showDeleteAccountModal = false} disabled={isDeletingAccount}>
          Cancel
        </button>
        <button class="confirmation-btn danger" on:click={confirmDeleteAccount} disabled={isDeletingAccount}>
          {#if isDeletingAccount}
            <div class="spinner small"></div>
            Deleting...
          {:else}
            <AlertTriangle size={16} />
            Delete Account
          {/if}
        </button>
      </div>
    </div>
  </Modal>
{/if}

{#if showDeleteApiKeyConfirmation}
  <Modal isOpen={true} on:close={() => showDeleteApiKeyConfirmation = false} title="Remove API Key">
    <div class="confirmation-modal">
      <div class="confirmation-header">
        <div class="confirmation-icon danger">
          <AlertTriangle size={48} />
        </div>
        <h2 class="confirmation-title">Remove Together AI API Key?</h2>
        <p class="confirmation-desc">This will remove your personal Together AI API key. The application will then use the default API key.</p>
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-btn secondary" on:click={() => showDeleteApiKeyConfirmation = false} disabled={isVerifyingTogetherApiKey}>
          Cancel
        </button>
        <button class="confirmation-btn danger" on:click={handleRemoveTogetherApiKey} disabled={isVerifyingTogetherApiKey}>
          {#if isVerifyingTogetherApiKey}
            <div class="spinner small"></div>
            Removing...
          {:else}
            <Trash2 size={16} />
            Remove Key
          {/if}
        </button>
      </div>
    </div>
  </Modal>
{/if}
{#if showDeleteFilesConfirmation}
  <Modal isOpen={true} on:close={() => showDeleteFilesConfirmation = false} title="Delete Files">
    <div class="confirmation-modal">
      <div class="confirmation-header">
        <div class="confirmation-icon danger">
          <AlertTriangle size={48} />
        </div>
        <h2 class="confirmation-title">
          {selectedFiles.length === 0 ? 'Delete All Files?' : `Delete ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}?`}
        </h2>
        <p class="confirmation-desc">
          This action cannot be undone. The files will be permanently removed from your account.
        </p>
      </div>
      <div class="confirmation-actions">
        <button class="confirmation-btn secondary" on:click={() => showDeleteFilesConfirmation = false} disabled={isDeletingFiles}>
          Cancel
        </button>
        <button 
          class="confirmation-btn danger" 
          on:click={() => confirmDeleteFiles(selectedFiles.length === 0)}
          disabled={isDeletingFiles}
        >
          {#if isDeletingFiles}
            <div class="spinner small"></div>
            Deleting...
          {:else}
            <Trash2 size={16} />
            Delete
          {/if}
        </button>
      </div>
    </div>
  </Modal>
{/if}
<style>
  /* Widen the modal on larger screens and remove the hardcoded background */
  :global(.settings-modal) {
    --modal-width: 90vw;
    --modal-max-width: 864px; /* Default max-width */
    --modal-height: 90vh;
    --modal-max-height: 800px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  @media (min-width: 1280px) {
    :global(.settings-modal) {
      --modal-max-width: 1024px; /* Increased width for desktop */
    }
  }

  :global(.settings-modal .modal-header) {
    display: none;
  }

  :global(.settings-modal .modal-body) {
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  /* Container */
  .settings-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .close-button {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s ease;
    z-index: 20;
  }

  .close-button:hover {
    color: var(--text-color);
  }

  .mobile-tab-selector {
    display: none;
    position: relative;
    border-bottom: 1px solid var(--border-color);
    z-index: 10;
    padding: 1rem 1.5rem;
  }

  .mobile-header {
    text-align: center;
  }

  .mobile-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }

  .mobile-subtitle {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
  }

  .mobile-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 0 0 12px 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 20;
  }

  .mobile-dropdown-item {
    width: 100%;
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--border-color);
  }

  .mobile-dropdown-item:last-child {
    border-bottom: none;
  }

  .mobile-dropdown-item:hover {
    background: var(--hover-color);
  }

  .mobile-dropdown-item.active {
    background: var(--primary-color-translucent);
  }

  .mobile-dropdown-icon {
    width: 36px;
    height: 36px;
    background: var(--surface-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .mobile-dropdown-item.active .mobile-dropdown-icon {
    background: var(--primary-color);
    color: white;
  }

  .mobile-dropdown-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .mobile-dropdown-title {
    font-weight: 500;
    color: var(--text-color);
    font-size: 0.9rem;
  }

  .mobile-dropdown-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .mobile-menu-trigger {
    display: none;
    position: absolute;
    top: 1.5rem;
    right: 4rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s ease;
    z-index: 20;
  }

  .mobile-menu-trigger:hover {
    color: var(--text-color);
  }

  .mobile-chevron {
    transition: transform 0.2s ease;
  }

  .mobile-chevron.rotated {
    transform: rotate(90deg);
  }

  /* Main Layout */
  .settings-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Desktop Sidebar */
  .desktop-sidebar {
    width: 280px;
    background: var(--surface-color);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 2rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .sidebar-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1rem;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    justify-content: center;
  }

  .sidebar-item {
    background: none;
    border: none;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .sidebar-item:hover {
    background: var(--hover-color);
  }

  .sidebar-item.active {
    background: var(--primary-color-translucent);
  }

  .sidebar-item-icon {
    width: 40px;
    height: 40px;
    background: var(--background-color);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .sidebar-item.active .sidebar-item-icon {
    background: var(--primary-color);
    color: white;
  }

  .sidebar-item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sidebar-item-title {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.95rem;
  }

  .sidebar-item-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .sidebar-chevron {
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .sidebar-item.active .sidebar-chevron {
    color: var(--primary-color);
  }

  /* Main Content */
  .settings-main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  .settings-content::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  /* Section Styling */
  .settings-section {
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-content {
    text-align: center;
    flex-grow: 1;
  }

  .mobile-nav-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .mobile-nav-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }

  .mobile-nav-btn.visible {
    display: block;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .section-desc {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Settings Grid */
  .settings-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }

  .setting-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s ease;
    position: relative;
  }

  .setting-card:hover {
    border-color: var(--primary-color-translucent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .setting-card.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .setting-card.danger {
    border-color: rgba(239, 68, 68, 0.2);
  }

  .setting-card.danger:hover {
    border-color: rgba(239, 68, 68, 0.4);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
  }

  .setting-card.full-width {
    grid-column: 1 / -1;
  }

  .setting-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .setting-icon {
    width: 44px;
    height: 44px;
    background: var(--primary-color-translucent);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .setting-card.danger .setting-icon {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .setting-info {
    flex: 1;
    min-width: 0; /* Ensure it can shrink */
    overflow-wrap: break-word; /* Ensure long words break */
  }

  .setting-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .setting-desc {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.4;
    margin: 0;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap; /* Allow items to wrap if space is constrained */
  }

  .setting-control.full {
    width: 100%;
  }

  /* Ensure the read-only-field behaves well within the flex container */
  .setting-control .read-only-field {
    flex: 1 1 auto; /* Allow it to grow and shrink, with a flexible basis */
    min-width: 0; /* Crucial for flex items to shrink below their content size */
  }

  /* Ensure the action button doesn't get too small */
  .setting-control .action-btn {
    flex-shrink: 0; /* Prevent button from shrinking */
  }

  @media (max-width: 768px) {
    .setting-control {
      flex-direction: column; /* Stack items vertically on mobile for better layout */
      align-items: flex-start; /* Align items to the start */
      width: 100%; /* Take full width */
    }

    .setting-control .read-only-field {
      width: 100%; /* Take full width when stacked */
      margin-bottom: 0.5rem; /* Add some space below the field */
    }

    .setting-control .action-btn {
      width: 100%; /* Make button full width when stacked */
    }
  }

  .input-wrapper {
    position: relative;
    flex: 1;
  }

  .modern-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--border-color);
    border-radius: 8px;
    background: var(--background-color);
    color: var(--text-color);
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .modern-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-translucent);
  }

  .modern-input::placeholder {
    color: var(--text-muted);
  }

  .input-status {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-status.saving {
    color: var(--primary-color);
  }

  .input-status.saved {
    color: #10b981;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .theme-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--background-color);
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .theme-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .theme-label.active {
    color: var(--primary-color);
    font-weight: 600;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn.primary {
    background: var(--primary-color);
    color: white;
  }

  .action-btn.primary:hover {
    background: var(--primary-hover);
  }

  .action-btn.danger {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .read-only-field {
    padding: 0.75rem 1rem;
    background: var(--background-color);
    border: 1.5px solid var(--border-color);
    border-radius: 8px;
    min-width: 0; /* Allow shrinking */
    overflow-x: auto; /* Enable horizontal scrolling */
    white-space: nowrap; /* Prevent text wrapping */
    flex-shrink: 1; /* Allow it to shrink within flex container */
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  .read-only-field::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .field-value {
    font-size: 0.9rem;
    color: var(--text-color);
    font-weight: 500;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    width: 100%;
  }

  .slider-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  .modern-slider {
    flex: 1;
    height: 6px;
    background: var(--border-color);
    border-radius: 3px;
    outline: none;
    appearance: none;
    cursor: pointer;
  }

  .modern-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--primary-color);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .modern-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--primary-color);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .slider-value {
    background: var(--primary-color-translucent);
    color: var(--primary-color);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    min-width: 60px;
    text-align: center;
  }

  .api-feedback-message {
    font-size: 0.85rem;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background-color: rgba(102, 126, 234, 0.1);
    color: var(--primary-color);
    border: 1px solid var(--primary-color-translucent);
  }

  .api-feedback-message.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
  }

  .api-key-notes {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 1rem;
    line-height: 1.4;
  }

  .api-key-notes a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .api-key-notes a:hover {
    text-decoration: underline;
  }

  .api-key-status-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--surface-color);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border-color);
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .footer-btn.primary {
    background: var(--primary-color);
    color: white;
  }

  .footer-btn.primary:hover {
    background: var(--primary-hover);
  }

  .confirmation-modal {
    padding: 2rem;
    text-align: center;
  }

  .confirmation-header {
    margin-bottom: 2rem;
  }

  .confirmation-icon {
    width: 80px;
    height: 80px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: #ef4444;
  }

  .confirmation-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 1rem;
  }

  .confirmation-desc {
    font-size: 0.95rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .confirmation-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .confirmation-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
    justify-content: center;
  }

  .confirmation-btn.secondary {
    background: var(--surface-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .confirmation-btn.secondary:hover {
    background: var(--hover-color);
  }

  .confirmation-btn.danger {
    background: #ef4444;
    color: white;
  }

  .confirmation-btn.danger:hover {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    :global(.settings-modal .modal-content) {
      width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
    }

    .mobile-tab-selector {
      display: block;
    }

    .mobile-menu-trigger {
      display: block;
    }

    .desktop-sidebar {
      display: none;
    }

    .settings-content {
      padding: 1rem;
    }

    .settings-grid {
      grid-template-columns: 1fr; /* Force single column on mobile */
      gap: 1rem;
    }

    .setting-card {
      padding: 1.25rem;
      min-width: 0; /* Ensure it can shrink */
    }

    .setting-header {
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .setting-header {
      flex-direction: row;
      align-items: flex-start;
    }

    .setting-control {
      margin-top: 1rem;
      justify-content: flex-start;
    }

    .links-grid {
      grid-template-columns: 1fr;
    }

    .slider-wrapper {
      flex-direction: column;
      gap: 0.75rem;
    }

    .modern-slider {
      width: 100%;
    }

    .modal-footer {
      padding: 1rem;
    }

    .confirmation-modal {
      padding: 1.5rem;
    }

    .confirmation-actions {
      flex-direction: column;
      gap: 0.75rem;
    }

    .confirmation-btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }

    .setting-card {
      padding: 1rem;
    }

    .setting-header {
      gap: 0.5rem;
    }

    .setting-icon {
      width: 36px;
      height: 36px;
    }

    .setting-title {
      font-size: 1rem;
    }

    .setting-desc {
      font-size: 0.8rem;
    }
  }
.files-management {
  width: 100%;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--text-muted);
}

.error-state {
  color: #ef4444;
}

.empty-state {
  color: var(--text-muted);
}

.empty-state h4 {
  margin: 0.5rem 0 0.25rem;
  color: var(--text-color);
  font-size: 1.1rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.files-count {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.count-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.count-label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.selected-count {
  font-size: 0.85rem;
  color: var(--primary-color);
  font-weight: 500;
}

.files-actions {
  display: flex;
  gap: 0.5rem;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.file-item:hover {
  border-color: var(--primary-color-translucent);
  background: var(--surface-color);
}

.file-item.selected {
  border-color: var(--primary-color);
  background: var(--primary-color-translucent);
}

.file-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.file-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-item-info {
  flex: 1;
  min-width: 0;
}

.file-item-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.file-item-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.file-item-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

 @media (max-width: 768px) {
  .files-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .files-actions {
    width: 100%;
    flex-direction: column;
  }

  .files-actions .action-btn {
    width: 100%;
  }

  .file-item-meta {
    flex-wrap: wrap;
  }
}
</style>