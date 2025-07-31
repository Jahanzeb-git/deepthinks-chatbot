<script lang="ts">
  import { onMount } from 'svelte';
  
  let mounted = false;
  
  onMount(() => {
    mounted = true;
  });
</script>

<div class="loading-container" class:mounted>
  <div class="geometric-loader">
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    <div class="shape shape-3"></div>
    <div class="breathing-core"></div>
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .loading-container.mounted {
    opacity: 1;
  }
  
  .geometric-loader {
    position: relative;
    width: 40px;
    height: 40px;
  }
  
  .shape {
    position: absolute;
    border-radius: 50%;
    animation: breathe 2s ease-in-out infinite;
  }
  
  .shape-1 {
    top: 0;
    left: 0;
    width: 12px;
    height: 12px;
    background: linear-gradient(45deg, #667eea, #764ba2);
    animation-delay: 0s;
  }
  
  .shape-2 {
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background: linear-gradient(45deg, #764ba2, #667eea);
    animation-delay: 0.3s;
  }
  
  .shape-3 {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    background: linear-gradient(45deg, #667eea, #764ba2);
    animation-delay: 0.6s;
  }
  
  .breathing-core {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes breathe {
    0%, 100% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0.5;
    }
  }
</style>