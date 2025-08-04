<script lang="ts">
  import { onMount } from 'svelte';
  
  let mounted = false;
  
  onMount(() => {
    mounted = true;
  });
</script>

<div class="loading-container" class:mounted>
  <div class="orbital-loader">
    <!-- Three orbital paths -->
    <div class="orbit orbit-1">
      <div class="dot"></div>
    </div>
    <div class="orbit orbit-2">
      <div class="dot"></div>
    </div>
    <div class="orbit orbit-3">
      <div class="dot"></div>
    </div>
    
    <!-- Central core -->
    <div class="center-core"></div>
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    opacity: 0;
    transform: translateY(8px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .loading-container.mounted {
    opacity: 1;
    transform: translateY(0);
  }
  
  .orbital-loader {
    position: relative;
    width: 48px;
    height: 48px;
  }
  
  /* Orbital paths */
  .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(99, 102, 241, 0.15);
  }
  
  .orbit-1 {
    width: 48px;
    height: 48px;
    top: 0;
    left: 0;
    animation: rotate 2.4s linear infinite;
  }
  
  .orbit-2 {
    width: 36px;
    height: 36px;
    top: 6px;
    left: 6px;
    animation: rotate 2s linear infinite reverse;
  }
  
  .orbit-3 {
    width: 24px;
    height: 24px;
    top: 12px;
    left: 12px;
    animation: rotate 1.6s linear infinite;
  }
  
  /* Orbiting dots */
  .dot {
    position: absolute;
    width: 4px;
    height: 4px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    animation: dotPulse 2s ease-in-out infinite;
  }
  
  .orbit-2 .dot {
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    animation-delay: 0.3s;
  }
  
  .orbit-3 .dot {
    background: linear-gradient(135deg, #ec4899, #f97316);
    animation-delay: 0.6s;
  }
  
  /* Central core */
  .center-core {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: linear-gradient(135deg, #ffffff, #f1f5f9);
    border-radius: 50%;
    box-shadow: 
      0 0 12px rgba(99, 102, 241, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.8);
    animation: centerPulse 3s ease-in-out infinite;
  }
  
  /* Animations */
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes dotPulse {
    0%, 100% {
      transform: translateX(-50%) scale(1);
      opacity: 0.8;
    }
    50% {
      transform: translateX(-50%) scale(1.2);
      opacity: 1;
    }
  }
  
  @keyframes centerPulse {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.9;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.15);
      opacity: 1;
    }
  }
  
  /* Responsive design */
  @media (max-width: 480px) {
    .orbital-loader {
      width: 40px;
      height: 40px;
    }
    
    .orbit-1 {
      width: 40px;
      height: 40px;
    }
    
    .orbit-2 {
      width: 30px;
      height: 30px;
      top: 5px;
      left: 5px;
    }
    
    .orbit-3 {
      width: 20px;
      height: 20px;
      top: 10px;
      left: 10px;
    }
  }
  
  /* Reduced motion accessibility */
  @media (prefers-reduced-motion: reduce) {
    .orbit {
      animation-duration: 4s;
    }
    
    .dotPulse,
    .centerPulse {
      animation-duration: 3s;
    }
  }
</style>