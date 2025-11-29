<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CONTAINER_CONFIG } from '../stores/containerTimer';
  
  export let mode: 'fullscreen' | 'inline' = 'fullscreen';
  export let showBootCountdown: boolean = true; // Whether to show boot countdown
  export let onComplete: () => void = () => {};
  
  let timeLeft = 10;
  let mounted = false;
  let bootPhaseComplete = false;
  let currentLoadingText = '';
  
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let loadingTextInterval: ReturnType<typeof setInterval> | null = null;
  
  // Professional loading texts that cycle
  const loadingTexts = [
    'Pondering...',
    'Analyzing...',
    'Just a moment...',
    'Processing...',
    'Almost there...',
    'Thinking...',
  ];
  let currentTextIndex = 0;
  
  function startBootCountdown() {
    timeLeft = 10;
    countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        bootPhaseComplete = true;
        startLoadingTextCycle();
      }
    }, 1000);
  }
  
  function startLoadingTextCycle() {
    // Set initial text
    currentLoadingText = loadingTexts[0];
    currentTextIndex = 0;
    
    // Cycle through loading texts
    loadingTextInterval = setInterval(() => {
      currentTextIndex = (currentTextIndex + 1) % loadingTexts.length;
      currentLoadingText = loadingTexts[currentTextIndex];
    }, CONTAINER_CONFIG.LOADING_TEXT_INTERVAL);
  }
  
  onMount(() => {
    mounted = true;
    
    if (showBootCountdown) {
      // Start with boot countdown
      startBootCountdown();
    } else {
      // Skip boot countdown, go straight to loading texts
      bootPhaseComplete = true;
      startLoadingTextCycle();
    }
  });
  
  onDestroy(() => {
    if (countdownInterval) clearInterval(countdownInterval);
    if (loadingTextInterval) clearInterval(loadingTextInterval);
  });
</script>

{#if mode === 'fullscreen'}
  <div class="fullscreen-container" class:mounted>
    <div class="boot-content">
      <div class="loading-spinner">
        <div class="orbital">
          <div class="orbit orbit-1">
            <div class="dot"></div>
          </div>
          <div class="orbit orbit-2">
            <div class="dot"></div>
          </div>
          <div class="orbit orbit-3">
            <div class="dot"></div>
          </div>
          <div class="center-core"></div>
        </div>
      </div>
      
      {#if !bootPhaseComplete}
        <h2 class="boot-title">Booting up the container...</h2>
        <p class="boot-timer">{timeLeft}s</p>
      {:else}
        {#key currentLoadingText}
          <h2 class="boot-title loading-text">{currentLoadingText}</h2>
        {/key}
      {/if}
    </div>
  </div>
{:else}
  <div class="inline-container" class:mounted>
    <div class="inline-content">
      {#if !bootPhaseComplete}
        <p class="inline-text">Booting up the container... <span class="inline-timer">{timeLeft}s</span></p>
      {:else}
        {#key currentLoadingText}
          <p class="inline-text loading-text">{currentLoadingText}</p>
        {/key}
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Fullscreen mode */
  .fullscreen-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--sb-bg, #F9F8F6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fullscreen-container.mounted {
    opacity: 1;
  }

  :global([data-theme="dark"]) .fullscreen-container {
    background: var(--sb-bg, #1C1B1A);
  }

  .boot-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Orbital loader styles remain same */
  .loading-spinner {
    position: relative;
    width: 64px;
    height: 64px;
  }

  .orbital {
    position: relative;
    width: 64px;
    height: 64px;
  }

  .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(99, 102, 241, 0.15);
  }

  .orbit-1 {
    width: 64px;
    height: 64px;
    top: 0;
    left: 0;
    animation: rotate 2.4s linear infinite;
  }

  .orbit-2 {
    width: 48px;
    height: 48px;
    top: 8px;
    left: 8px;
    animation: rotate 2s linear infinite reverse;
  }

  .orbit-3 {
    width: 32px;
    height: 32px;
    top: 16px;
    left: 16px;
    animation: rotate 1.6s linear infinite;
  }

  .dot {
    position: absolute;
    width: 5px;
    height: 5px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    top: -2.5px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
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

  .center-core {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #ffffff, #f1f5f9);
    border-radius: 50%;
    box-shadow: 
      0 0 15px rgba(99, 102, 241, 0.25),
      inset 0 1px 2px rgba(255, 255, 255, 0.8);
    animation: centerPulse 3s ease-in-out infinite;
  }

  .boot-title {
    font-family: var(--sb-font-sans, "Inter", system-ui, sans-serif);
    font-size: 1.25rem;
    font-weight: 400;
    font-style: italic;
    color: var(--sb-text-muted, #787570);
    margin: 0;
    letter-spacing: -0.01em;
    opacity: 0.8;
    position: relative;
    overflow: hidden;
  }

  /* Shimmer effect for fullscreen title */
  .boot-title::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transform: translateX(-100%);
    animation: shimmer 2s infinite;
  }

  :global([data-theme="dark"]) .boot-title::after {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
  }

  .loading-text {
    animation: textFade 0.5s ease-in-out;
  }

  .boot-timer {
    font-family: var(--sb-font-sans, "Inter", system-ui, sans-serif);
    font-size: 1rem;
    font-weight: 400;
    color: var(--sb-text-muted, #787570);
    margin: 0;
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }

  /* Inline mode - Premium Redesign */
  .inline-container {
    display: flex;
    align-items: center;
    padding: 0; /* Removed padding */
    background: transparent; /* Removed background */
    border: none; /* Removed border */
    margin-left: 1rem;
    opacity: 0;
    transform: translateX(-4px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .inline-container.mounted {
    opacity: 1;
    transform: translateX(0);
  }

  .inline-content {
    display: flex;
    align-items: center;
  }

  .inline-text {
    font-family: var(--sb-font-sans, "Inter", system-ui, sans-serif);
    font-size: 0.9375rem; /* Slightly larger */
    font-weight: 400;
    font-style: italic; /* Italic style */
    color: var(--text-muted, #787570); /* Muted color */
    margin: 0;
    min-width: 200px;
    opacity: 0.7; /* Medium opacity */
    position: relative;
    display: inline-block;
    -webkit-mask-image: linear-gradient(
      -75deg,
      rgba(0,0,0,0.6) 30%,
      #000 50%,
      rgba(0,0,0,0.6) 70%
    );
    -webkit-mask-size: 200%;
    animation: shine 2s infinite;
  }

  :global([data-theme="dark"]) .inline-text {
    color: var(--text-muted, #9C9A96);
  }

  .inline-timer {
    color: var(--text-muted, #787570);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }

  /* Animations */
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes shine {
    from {
      -webkit-mask-position: 150%;
    }
    to {
      -webkit-mask-position: -50%;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes textFade {
    0% {
      opacity: 0;
      transform: translateY(2px);
    }
    100% {
      opacity: 0.7;
      transform: translateY(0);
    }
  }

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
      transform: translateX(-50%) scale(1.3);
      opacity: 1;
    }
  }

  @keyframes centerPulse {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.9;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 1;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .boot-title {
      font-size: 1.125rem;
    }

    .loading-spinner {
      width: 56px;
      height: 56px;
    }

    .orbital {
      width: 56px;
      height: 56px;
    }

    .orbit-1 {
      width: 56px;
      height: 56px;
    }

    .orbit-2 {
      width: 42px;
      height: 42px;
      top: 7px;
      left: 7px;
    }

    .orbit-3 {
      width: 28px;
      height: 28px;
      top: 14px;
      left: 14px;
    }

    .inline-text {
      font-size: 0.875rem;
      min-width: 180px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .orbit, .dotPulse, .centerPulse, .boot-content, .inline-container, .textFade, .boot-title::after, .inline-text {
      animation: none;
    }
  }
</style>
