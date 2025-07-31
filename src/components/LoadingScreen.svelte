<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/auth';
  
  export let onLoadingComplete: () => void;
  
  let mounted = false;
  let logoVisible = false;
  
  onMount(() => {
    mounted = true;
    
    // Initialize auth from storage
    authStore.initializeFromStorage();
    
    // Show logo with delay
    setTimeout(() => {
      logoVisible = true;
    }, 300);
    
    // Complete loading after animation
    setTimeout(() => {
      onLoadingComplete();
    }, 2500);
  });
</script>

<div class="loading-screen" class:mounted>
  <div class="logo-container" class:visible={logoVisible}>
    <div class="logo">
      <span class="logo-text">Deepthinks</span>
      <div class="logo-animation">
        <div class="pulse-ring"></div>
        <div class="pulse-ring delay-1"></div>
        <div class="pulse-ring delay-2"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  
  .loading-screen.mounted {
    opacity: 1;
  }
  
  .logo-container {
    position: relative;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .logo-container.visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  .logo {
    position: relative;
    text-align: center;
  }
  
  .logo-text {
    font-size: 3.5rem;
    font-weight: 700;
    background: linear-gradient(45deg, #ffffff, #f0f0f0, #ffffff);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 2s ease-in-out infinite;
    letter-spacing: -0.02em;
  }
  
  .logo-animation {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  
  .pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200px;
    height: 200px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .pulse-ring.delay-1 {
    animation-delay: 0.5s;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .pulse-ring.delay-2 {
    animation-delay: 1s;
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  @keyframes shimmer {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  @keyframes pulse {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.4);
      opacity: 0;
    }
  }
  
  @media (max-width: 768px) {
    .logo-text {
      font-size: 2.5rem;
    }
    
    .pulse-ring {
      width: 150px;
      height: 150px;
    }
  }
</style>