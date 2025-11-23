<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Info, Link, Mail, Github, Code2, Brain, Scale } from 'lucide-svelte';

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  function closeModal() {
    dispatch('close');
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <button class="close-btn" on:click={closeModal} aria-label="Close modal">
        <X size={20} strokeWidth={1.5} />
      </button>

      <div class="modal-grid">
        <!-- Left Column: Identity & Bio -->
        <div class="modal-sidebar">
          <div class="brand-section">
            <div class="header-icon">
              <Info size={32} strokeWidth={1.5} />
            </div>
            <h2 class="modal-title">Deepthinks</h2>
            <p class="modal-subtitle">Applied AI Portfolio</p>
          </div>

          <div class="developer-card">
            <p class="dev-label">Designed & Engineered by</p>
            <h3 class="dev-name">Jahanzeb Ahmed</h3>
            <div class="contact-links">
              <a href="https://jahanzebahmed.netlify.app" target="_blank" rel="noopener noreferrer" class="contact-link" title="Portfolio">
                <Link size={16} strokeWidth={1.5} />
              </a>
              <a href="https://github.com/Jahanzeb-git" target="_blank" rel="noopener noreferrer" class="contact-link" title="GitHub">
                <Github size={16} strokeWidth={1.5} />
              </a>
              <a href="mailto:jahanzebahmed.mail@gmail.com" class="contact-link" title="Email">
                <Mail size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>
          
          <div class="license-badge">
            <Scale size={16} strokeWidth={1.5} />
            <span>MIT Licensed</span>
          </div>
        </div>

        <!-- Right Column: Technical Details -->
        <div class="modal-main">
          <p class="intro-text">
            This application serves as a comprehensive demonstration of expertise in <strong>Applied AI Engineering</strong>. It is a non-commercial portfolio piece designed to showcase advanced architectural capabilities.
          </p>

          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon">
                <Code2 size={20} strokeWidth={1.5} />
              </div>
              <div class="feature-content">
                <h4>Pure Implementation</h4>
                <p>Built entirely without high-level abstractions like LangChain or LangGraph, demonstrating deep understanding of LLM orchestration.</p>
              </div>
            </div>

            <div class="feature-item">
              <div class="feature-icon">
                <Brain size={20} strokeWidth={1.5} />
              </div>
              <div class="feature-content">
                <h4>Dynamic Smoothing Memory</h4>
                <p>Features a proprietary memory system designed for enhanced context retention and fluid conversation flow.</p>
              </div>
            </div>
          </div>

          <div class="repo-cta">
            <p>Access the complete source code for frontend and backend architectures on GitHub.</p>
            <a href="https://github.com/Jahanzeb-git" target="_blank" rel="noopener noreferrer" class="repo-link">
              View Repository <Github size={14} strokeWidth={1.5} style="margin-left: 6px;" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* --- Local Design System: Warm Editorial --- */
  .modal-content {
    /* Light Mode Defaults */
    --am-bg: #F9F8F6;
    --am-sidebar-bg: #F2F0ED;
    --am-text: #2C2C2C;
    --am-text-muted: #787570;
    --am-border: rgba(0, 0, 0, 0.06);
    --am-hover: rgba(44, 44, 44, 0.05);
    --am-accent: #667eea;
    --am-font-serif: "Merriweather", "Georgia", serif;
    --am-font-sans: "Inter", system-ui, sans-serif;
  }

  :global([data-theme="dark"]) .modal-content {
    /* Dark Mode Overrides */
    --am-bg: #1C1B1A;
    --am-sidebar-bg: #232221;
    --am-text: #E6E4E0;
    --am-text-muted: #9C9A96;
    --am-border: rgba(255, 255, 255, 0.06);
    --am-hover: rgba(255, 255, 255, 0.05);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    animation: fadeIn 0.3s ease;
    padding: 2.5rem;
  }

  .modal-content {
    background: var(--am-bg);
    color: var(--am-text);
    border-radius: 16px;
    width: 100%;
    max-width: 800px;
    max-height: calc(100vh - 5rem);
    box-shadow: 
      0 10px 30px -5px rgba(0, 0, 0, 0.1),
      0 0 0 1px var(--am-border);
    position: relative;
    font-family: var(--am-font-sans);
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .modal-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 400px;
  }

  /* --- Sidebar (Left) --- */
  .modal-sidebar {
    background: var(--am-sidebar-bg);
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--am-border);
    text-align: center;
    align-items: center;
  }

  .brand-section {
    margin-bottom: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    background: var(--am-bg);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--am-text);
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }

  .modal-title {
    font-family: var(--am-font-serif);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--am-text);
    margin: 0 0 0.25rem;
    letter-spacing: -0.02em;
  }

  .modal-subtitle {
    font-size: 0.875rem;
    color: var(--am-text-muted);
    font-weight: 500;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .developer-card {
    margin: 2rem 0;
    width: 100%;
  }

  .dev-label {
    font-size: 0.75rem;
    color: var(--am-text-muted);
    margin-bottom: 0.5rem;
  }

  .dev-name {
    font-family: var(--am-font-serif);
    font-size: 1.125rem;
    color: var(--am-text);
    margin: 0 0 1rem;
    font-weight: 600;
  }

  .contact-links {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .contact-link {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--am-bg);
    border: 1px solid var(--am-border);
    color: var(--am-text-muted);
    transition: all 0.2s ease;
  }

  .contact-link:hover {
    color: var(--am-text);
    border-color: var(--am-text);
    transform: translateY(-2px);
  }

  .license-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--am-text-muted);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    border: 1px solid var(--am-border);
    background: var(--am-bg);
    margin-top: auto;
  }

  /* --- Main Content (Right) --- */
  .modal-main {
    padding: 2.5rem 3rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .intro-text {
    font-family: var(--am-font-serif);
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--am-text);
    margin-bottom: 2.5rem;
  }

  .features-grid {
    display: grid;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .feature-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .feature-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--am-sidebar-bg);
    border-radius: 8px;
    color: var(--am-text);
  }

  .feature-content h4 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    color: var(--am-text);
  }

  .feature-content p {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--am-text-muted);
    margin: 0;
  }

  .repo-cta {
    margin-top: auto;
    padding-top: 1.5rem;
    border-top: 1px solid var(--am-border);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .repo-cta p {
    font-size: 0.875rem;
    color: var(--am-text-muted);
    margin: 0;
  }

  .repo-link {
    display: inline-flex;
    align-items: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--am-text);
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .repo-link:hover {
    opacity: 0.7;
    text-decoration: underline;
  }

  /* --- Close Button --- */
  .close-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: transparent;
    border: none;
    color: var(--am-text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
    z-index: 10;
  }
  .close-btn:hover {
    background: var(--am-hover);
    color: var(--am-text);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.98) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* --- Mobile Responsive --- */
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 1rem;
    }

    .modal-grid {
      grid-template-columns: 1fr;
    }
    
    .modal-sidebar {
      border-right: none;
      border-bottom: 1px solid var(--am-border);
      padding: 2rem 1.5rem;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
      text-align: left;
      align-items: center;
    }

    .brand-section {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      margin: 0;
    }
    
    .header-icon {
      margin: 0;
      width: 40px;
      height: 40px;
    }

    .modal-title {
      font-size: 1.25rem;
      margin: 0;
    }
    
    .modal-subtitle {
      font-size: 0.75rem;
    }

    .developer-card, .license-badge {
      display: none;
    }
    
    .modal-main {
      padding: 1.5rem;
    }

    .intro-text {
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .close-btn {
      top: 1rem;
      right: 1rem;
    }
  }
</style>