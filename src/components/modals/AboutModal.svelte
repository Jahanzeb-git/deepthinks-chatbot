<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { Info, Link, Mail, Github } from 'lucide-svelte';

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  function closeModal() {
    dispatch('close');
  }
</script>

<Modal {isOpen} on:close={closeModal} title="About This Project" modalClass="about-modal">
  <div class="about-content">
    <div class="about-header">
      <div class="header-icon">
        <Info size={28} />
      </div>
      <h2 class="about-title">Project Information</h2>
    </div>
    
    <p class="about-description">
      This project is a portfolio piece and does not represent a commercial application. As it has not been thoroughly tested, there may be bugs or mistakes.
    </p>
    
    <div class="developer-section">
      <div class="developer-info">
        <h3 class="developer-title">Developer</h3>
        <p class="developer-name">Jahanzeb Ahmed</p>
      </div>
      
      <div class="contact-links">
        <a href="https://jahanzebahmed.netlify.app" target="_blank" rel="noopener noreferrer" class="contact-link">
          <Link size={18} />
          <span>Website</span>
        </a>
        <a href="https://github.com/Jahanzeb-git" target="_blank" rel="noopener noreferrer" class="contact-link">
          <Github size={18} />
          <span>GitHub</span>
        </a>
        <a href="mailto:jahanzebahmed.mail@gmail.com" class="contact-link">
          <Mail size={18} />
          <span>Email</span>
        </a>
      </div>
    </div>
  </div>
</Modal>

<style>
  :global(.about-modal) {
    --modal-width: min(480px, 90vw);
    --modal-max-width: 480px;
    --modal-height: auto;
    --modal-max-height: min(520px, 85vh);
    border-radius: 20px;
    overflow: hidden;
  }

  :global(.about-modal .modal-header) {
    display: none;
  }

  :global(.about-modal .modal-body) {
    padding: 0;
    overflow-y: hidden;
  }

  .about-content {
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 0;
  }

  .about-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    background: var(--primary-color-translucent);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    margin-bottom: 0.75rem;
    transition: all 0.3s ease;
  }

  .about-title {
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
    text-align: center;
  }

  .about-description {
    font-size: 0.95rem;
    color: var(--text-muted);
    line-height: 1.5;
    text-align: center;
    margin: 0 0 1.5rem 0;
    max-width: 100%;
  }

  .developer-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .developer-info {
    text-align: center;
  }

  .developer-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.375rem 0;
  }

  .developer-name {
    font-size: 1rem;
    color: var(--text-muted);
    margin: 0;
    font-weight: 500;
  }

  .contact-links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    flex-wrap: wrap;
  }

  .contact-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 12px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    text-decoration: none;
    transition: all 0.25s ease;
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 0;
    flex: 1;
    max-width: 120px;
  }

  .contact-link:hover {
    background: var(--hover-color);
    border-color: var(--primary-color);
    color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .contact-link:active {
    transform: translateY(0);
  }

  /* Mobile optimizations */
  @media (max-width: 640px) {
    :global(.about-modal) {
      --modal-width: calc(100vw - 2rem);
      --modal-max-width: calc(100vw - 2rem);
      --modal-max-height: min(480px, 80vh);
      border-radius: 16px;
    }

    .about-content {
      padding: 1.5rem 1.25rem;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      margin-bottom: 0.625rem;
    }

    .about-title {
      font-size: 1.25rem;
    }

    .about-description {
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }

    .developer-section {
      gap: 1rem;
    }

    .developer-title {
      font-size: 1rem;
    }

    .developer-name {
      font-size: 0.95rem;
    }

    .contact-links {
      gap: 0.5rem;
    }

    .contact-link {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      max-width: 110px;
      border-radius: 10px;
    }

    .contact-link span {
      display: none;
    }
  }

  /* Extra small mobile devices */
  @media (max-width: 480px) {
    :global(.about-modal) {
      --modal-width: calc(100vw - 1.5rem);
      --modal-max-width: calc(100vw - 1.5rem);
    }

    .about-content {
      padding: 1.25rem 1rem;
    }

    .contact-links {
      justify-content: space-between;
    }

    .contact-link {
      flex: 0 1 auto;
      min-width: 48px;
      max-width: 48px;
      padding: 0.5rem;
      aspect-ratio: 1;
    }
  }

  /* Large screens */
  @media (min-width: 1024px) {
    .about-content {
      padding: 2rem 1.75rem;
    }

    .header-icon:hover {
      transform: scale(1.05);
    }

    .contact-link {
      max-width: 140px;
    }
  }
</style>