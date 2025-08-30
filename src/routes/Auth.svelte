<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Mail, Lock, User, ArrowLeft, AlertCircle } from 'lucide-svelte';
  import { authStore } from '../stores/auth';
  import { api } from '../lib/api';
  const dispatch = createEventDispatcher<{
    back: void;
    success: void;
  }>();
  
  export let initialMode: 'signup' | 'login' = 'signup';
  
  let mode = initialMode;
  let loading = false;
  let error = '';
  let showError = false;
  let showStatus = true;
  
  // Form fields
  let username = '';
  let email = '';
  let password = '';
  
  // Google Auth
  let googleLoaded = false;
  
  $: isSignup = mode === 'signup';
  $: buttonText = isSignup ? 'Sign Up' : 'Sign In';
  $: switchText = isSignup ? 'Already have an account?' : "Don't have an account?";
  $: switchAction = isSignup ? 'Sign In' : 'Sign Up';
  $: statusMessage = isSignup ? 'You are signing up to deepthinks' : 'You are logging in to deepthinks';
  
  onMount(() => {
    loadGoogleAuth();
  });
  
  function loadGoogleAuth() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = initializeGoogleAuth;
    document.head.appendChild(script);
  }
  
  function initializeGoogleAuth() {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '1061742468081-1g389n9i177f9vk95eg88tsornpfsbm4.apps.googleusercontent.com',
        callback: handleGoogleResponse
      });
      googleLoaded = true;
    }
  }
  
  async function handleGoogleResponse(response: any) {
    try {
      loading = true;
      error = '';
      
      const result = await api.googleLogin(response.credential);
      authStore.login(result.access_token, result.user);
      dispatch('success');
    } catch (err: any) {
      showErrorWithMessage(err.message || 'Google authentication failed');
    } finally {
      loading = false;
    }
  }
  
  function renderGoogleButton() {
    if (window.google && googleLoaded) {
      // Clear existing button
      const container = document.getElementById('google-signin-button');
      if (container) {
        container.innerHTML = '';
      }
      
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );
    }
  }
  
  async function handleSubmit() {
    if (loading) return;
    
    try {
      loading = true;
      error = '';
      
      if (isSignup) {
        if (!username.trim() || !email.trim() || !password.trim()) {
          throw new Error('All fields are required');
        }
        
        await api.signup(username.trim(), email.trim(), password);
        authStore.signup();
        
        // Show success message and switch to login mode
        showErrorWithMessage('Signup successful! Please log in to continue.', true);
        mode = 'login';
        username = '';
        email = '';
        password = '';
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Email and password are required');
        }
        
        const result = await api.login(email.trim(), password);
        authStore.login(result.access_token, result.user);
        dispatch('success');
      }
    } catch (err: any) {
      showErrorWithMessage(err.message || 'Authentication failed');
    } finally {
      loading = false;
    }
  }
  
  function showErrorWithMessage(message: string, isSuccess = false) {
    error = message;
    showError = true;
    
    // Auto-hide error after 2 seconds
    setTimeout(() => {
      showError = false;
      if (isSuccess) {
        // Clear message after hiding
        setTimeout(() => {
          error = '';
        }, 300);
      }
    }, 2000);
  }
  
  function switchMode() {
    mode = mode === 'signup' ? 'login' : 'signup';
    error = '';
    username = '';
    email = '';
    password = '';
    showStatus = true;
  }
  
  function handleBack() {
    dispatch('back');
  }
  
  // Render Google button when component mounts and when mode changes
  $: if (googleLoaded) {
    setTimeout(renderGoogleButton, 100);
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</svelte:head>

<div class="auth-container">
  {#if showStatus}
    <div class="status-message">
      <p>{statusMessage}</p>
    </div>
  {/if}
  
  {#if showError}
    <div class="error-notification {error.includes('successful') ? 'success' : ''}">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  {/if}
  
  <div class="auth-card">
    <button class="back-button" on:click={handleBack} aria-label="Go back">
      <ArrowLeft size={20} />
    </button>
    
    <div class="auth-header">
      <h1 class="auth-title">
        {isSignup ? 'Create Account' : 'Welcome Back'}
      </h1>
      <p class="auth-subtitle">
        {isSignup ? 'Join Deepthinks to start unlimited conversations' : 'Sign in to continue your conversations'}
      </p>
    </div>
    
    <div class="google-auth-section">
      <button class="custom-google-button" on:click={() => {
        if (window.google && googleLoaded) {
          window.google.accounts.id.prompt();
        }
      }}>
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Continue with Google</span>
      </button>
      
      <!-- Hidden Google button for actual functionality -->
      <div id="google-signin-button" style="display: none;"></div>
    </div>
    
    <div class="divider">
      <span>or</span>
    </div>
    
    <div class="email-auth-section">
      <form on:submit|preventDefault={handleSubmit} class="auth-form">
        {#if isSignup}
          <div class="form-group">
            <div class="input-wrapper">
              <User size={20} class="input-icon" />
              <input
                id="username"
                type="text"
                bind:value={username}
                placeholder="Username"
                class="form-input"
                disabled={loading}
                required
              />
            </div>
          </div>
        {/if}
        
        <div class="form-group">
          <div class="input-wrapper">
            <Mail size={20} class="input-icon" />
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="Email address"
              class="form-input"
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <div class="input-wrapper">
            <Lock size={20} class="input-icon" />
            <input
              id="password"
              type="password"
              bind:value={password}
              placeholder="Password"
              class="form-input"
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <button type="submit" class="submit-button" disabled={loading}>
          {loading ? 'Processing...' : buttonText}
        </button>
      </form>
    </div>
    
    <div class="auth-switch">
      <span>{switchText}</span>
      <button type="button" on:click={switchMode} class="switch-button">
        {switchAction}
      </button>
    </div>
  </div>
</div>

<style>
  :global(body) {
    font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: transparent;
    position: relative;
  }
  
  .status-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50px;
    padding: 12px 20px;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }
  
  .status-message p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-color);
    font-weight: 500;
  }
  
  .error-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #ef4444;
    border-radius: 50px;
    padding: 12px 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideDown 0.3s ease-out forwards;
    backdrop-filter: blur(10px);
  }
  
  .error-notification.success {
    background: var(--success-background);
    border-color: var(--success-border);
    color: var(--success-text);
  }
  
  .error-notification.success svg {
    color: var(--success-text);
  }
  
  @keyframes slideDown {
    to {
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes slideUp {
    to {
      transform: translateX(-50%) translateY(-100px);
    }
  }
  
  .error-notification:not(.success) {
    animation: slideDown 0.3s ease-out forwards, slideUp 0.3s ease-out 1.7s forwards;
  }
  
  .error-notification.success {
    animation: slideDown 0.3s ease-out forwards, slideUp 0.3s ease-out 4.7s forwards;
  }
  
  .auth-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: transparent;
    border: none;
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: none;
  }
  
  .back-button {
    position: absolute;
    top: 1.25rem;
    left: 1.25rem;
    width: 44px;
    height: 44px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.3s ease;
    z-index: 10;
  }
  
  .back-button:hover {
    background: var(--hover-color);
    color: var(--text-color);
    transform: translateX(-2px);
  }
  
  .auth-header {
    text-align: center;
    margin-bottom: 2.5rem;
    margin-top: 1.5rem;
  }
  
  .auth-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
    letter-spacing: -0.5px;
  }
  
  .auth-subtitle {
    color: var(--text-muted);
    line-height: 1.6;
    font-size: 1rem;
    font-weight: 400;
  }
  
  .google-auth-section {
    margin-bottom: 2rem;
  }
  
  .custom-google-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 1rem 1.5rem;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50px;
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .custom-google-button:hover {
    background: var(--hover-color);
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .google-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
  
  .divider {
    position: relative;
    text-align: center;
    margin: 2rem 0;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border-color);
  }
  
  .divider span {
    background: var(--background-color);
    padding: 0 1.5rem;
  }
  
  .email-auth-section {
    background: transparent;
    border: none;
    border-radius: 20px;
    padding: 0;
    margin-bottom: 2rem;
  }
  
  .auth-form {
    width: 100%;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .input-wrapper {
    display: flex;
    align-items: center;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50px;
    transition: all 0.3s ease;
    padding: 1rem 1.5rem;
    gap: 1rem;
  }

  .input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-shadow);
  }

  .input-icon {
    color: var(--text-muted);
    transition: color 0.2s ease;
    flex-shrink: 0;
  }

  .input-wrapper:focus-within .input-icon {
    color: var(--primary-color);
  }

  .form-input {
    flex: 1;
    padding: 0;
    background: transparent;
    border: none;
    font-size: 1rem;
    color: var(--text-color);
    font-weight: 400;
    outline: none;
  }
  
  .form-input::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }
  
  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .submit-button {
    width: 100%;
    padding: 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.25px;
  }
  
  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px -4px var(--primary-shadow);
    background: var(--primary-hover);
  }
  
  .submit-button:active:not(:disabled) {
    transform: translateY(-1px);
  }
  
  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .auth-switch {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.95rem;
    font-weight: 400;
  }
  
  .switch-button {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-weight: 600;
    margin-left: 0.5rem;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s ease;
    padding: 2px 4px;
    border-radius: 4px;
  }
  
  .switch-button:hover {
    color: var(--primary-hover);
    background: var(--hover-color);
    text-decoration: none;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @media (max-width: 768px) {
    .auth-container {
      padding: 1.5rem;
    }
    
    .auth-card {
      padding: 2rem;
      max-width: 380px;
    }
    
    .auth-title {
      font-size: 1.625rem;
    }
    
    .status-message {
      display: none;
    }
    
    .custom-google-button {
      padding: 0.875rem 1.25rem;
    }
    
    .google-icon {
      width: 22px;
      height: 22px;
    }
  }
  
  @media (max-width: 480px) {
    .auth-container {
      padding: 1rem;
    }
    
    .auth-card {
      padding: 1.75rem;
      border-radius: 16px;
    }
    
    .auth-title {
      font-size: 1.5rem;
    }
    
    .auth-subtitle {
      font-size: 0.9rem;
    }
    
    .input-wrapper {
      padding: 0.875rem 1.25rem;
      gap: 0.75rem;
    }

    .form-input {
      padding: 0;
      font-size: 0.95rem;
    }
    
    .input-icon {
      margin-right: 0.75rem;
    }
    
    .submit-button {
      padding: 0.875rem;
      font-size: 0.95rem;
      border-radius: 50px;
    }
    
    .custom-google-button {
      padding: 0.875rem 1rem;
      border-radius: 50px;
      font-size: 0.95rem;
    }
    
    .google-icon {
      width: 20px;
      height: 20px;
    }
  }
</style>
