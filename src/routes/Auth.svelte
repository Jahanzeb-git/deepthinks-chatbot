<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { Mail, Lock, User, ArrowLeft } from 'lucide-svelte';
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
  
  // Form fields
  let username = '';
  let email = '';
  let password = '';
  
  // Google Auth
  let googleLoaded = false;
  
  $: isSignup = mode === 'signup';
  $: buttonText = isSignup ? 'Continue' : 'Continue';
  $: switchText = isSignup ? 'Already have an account?' : "Don't have an account?";
  $: switchAction = isSignup ? 'Sign In' : 'Sign Up';
  
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
      error = err.message || 'Google authentication failed';
    } finally {
      loading = false;
    }
  }
  
  function renderGoogleButton() {
    if (window.google && googleLoaded) {
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with'
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
        alert('Signup successful! Please log in to continue.');
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
      error = err.message || 'Authentication failed';
    } finally {
      loading = false;
    }
  }
  
  function switchMode() {
    mode = mode === 'signup' ? 'login' : 'signup';
    error = '';
    username = '';
    email = '';
    password = '';
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
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</svelte:head>

<div class="auth-container">
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
    
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleSubmit} class="auth-form">
      {#if isSignup}
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <div class="input-wrapper">
            <User size={18} class="input-icon" />
            <input
              id="username"
              type="text"
              bind:value={username}
              placeholder="Enter your username"
              class="form-input"
              disabled={loading}
              required
            />
          </div>
        </div>
      {/if}
      
      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <div class="input-wrapper">
          <Mail size={18} class="input-icon" />
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="Enter your email"
            class="form-input"
            disabled={loading}
            required
          />
        </div>
      </div>
      
      <div class="form-group">
        <label for="password" class="form-label">Password</label>
        <div class="input-wrapper">
          <Lock size={18} class="input-icon" />
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Enter your password"
            class="form-input"
            disabled={loading}
            required
          />
        </div>
      </div>
      
      <button type="submit" class="submit-button" disabled={loading}>
        {loading ? 'Please wait...' : buttonText}
      </button>
    </form>
    
    <div class="divider">
      <span>or</span>
    </div>
    
    <div id="google-signin-button" class="google-button-container"></div>
    
    <div class="auth-switch">
      <span>{switchText}</span>
      <button type="button" on:click={switchMode} class="switch-button">
        {switchAction}
      </button>
    </div>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--background-color);
  }
  
  .auth-card {
    position: relative;
    width: 100%;
    max-width: 400px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  }
  
  .back-button {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 40px;
    height: 40px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }
  
  .back-button:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }
  
  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
    margin-top: 1rem;
  }
  
  .auth-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }
  
  .auth-subtitle {
    color: var(--text-muted);
    line-height: 1.5;
  }
  
  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .auth-form {
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-label {
    display: block;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  .input-wrapper {
    position: relative;
  }
  
  .input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }
  
  .form-input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    color: var(--text-color);
    transition: all 0.2s ease;
  }
  
  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .submit-button {
    width: 100%;
    padding: 0.875rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .submit-button:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  
  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
    color: var(--text-muted);
    font-size: 0.9rem;
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
    background: var(--surface-color);
    padding: 0 1rem;
  }
  
  .google-button-container {
    margin-bottom: 1.5rem;
  }
  
  .auth-switch {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  
  .switch-button {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-weight: 600;
    margin-left: 0.25rem;
    text-decoration: underline;
  }
  
  .switch-button:hover {
    color: var(--primary-hover);
  }
  
  @media (max-width: 768px) {
    .auth-container {
      padding: 1rem;
    }
    
    .auth-card {
      padding: 1.5rem;
    }
    
    .auth-title {
      font-size: 1.5rem;
    }
  }
</style>