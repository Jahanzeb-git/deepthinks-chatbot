<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { UploadCloud, File as FileIcon, X } from 'lucide-svelte';
  import { fileStore } from '../stores/file';
  import { api } from '../lib/api';
  import { sessionStore } from '../stores/session';

  const dispatch = createEventDispatcher<{ close: void }>();

  let fileInput: HTMLInputElement;

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      fileStore.setFile(file);

      const token = localStorage.getItem('deepthinks_token');
      const sessions = JSON.parse(localStorage.getItem('deepthinks_sessions') || '[]');
      const sessionId = sessions[0] || null;

      if (!token || !sessionId) {
        fileStore.setStatus('error', 'Authentication token or session ID is missing.');
        return;
      }

      try {
        fileStore.setStatus('uploading');
        const response = await api.uploadFile(file, sessionId, token);
        fileStore.setSuccess(response.filename, response.size, response.type);
      } catch (error: any) {
        fileStore.setStatus('error', error.message);
      }
    }
  }

  function openFileDialog() {
    fileInput.click();
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
</script>

<div class="file-uploader-container">
  {#if $fileStore.status === 'idle'}
    <div class="upload-placeholder" on:click={openFileDialog}>
      <UploadCloud size={48} />
      <p>Click to browse or drag and drop a file</p>
      <span>Max file size: 10MB</span>
    </div>
  {/if}

  {#if $fileStore.status !== 'idle'}
    <div class="file-details">
      <div class="file-icon">
        <FileIcon size={32} />
      </div>
      <div class="file-info">
        <p class="filename">{$fileStore.filename}</p>
        <p class="filesize">{formatBytes($fileStore.size || 0)}</p>
      </div>
      {#if $fileStore.status === 'uploading'}
        <div class="status-indicator">Uploading...</div>
      {:else if $fileStore.status === 'success'}
        <div class="status-indicator success">Staged successfully!</div>
      {:else if $fileStore.status === 'error'}
        <div class="status-indicator error">{$fileStore.error}</div>
      {/if}
      <button class="close-button" on:click={() => fileStore.clearFile()}><X size={18} /></button>
    </div>
  {/if}

  <input type="file" bind:this={fileInput} on:change={handleFileChange} style="display: none;" />
</div>

<style>
  .file-uploader-container {
    position: relative;
    width: 100%;
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border: 2px dashed var(--border-color, #e2e8f0);
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    color: var(--text-muted, #9ca3af);
  }

  .upload-placeholder:hover {
    border-color: var(--primary-color, #3b82f6);
    color: var(--primary-color, #3b82f6);
  }

  .file-details {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-icon {
    flex-shrink: 0;
  }

  .file-info {
    flex-grow: 1;
  }

  .filename {
    font-weight: 500;
    color: var(--text-color, #1f2937);
  }

  .filesize {
    font-size: 0.875rem;
    color: var(--text-muted, #9ca3af);
  }

  .status-indicator {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-indicator.success {
    color: var(--success-color, #10b981);
  }

  .status-indicator.error {
    color: var(--error-color, #ef4444);
  }

  .close-button {
    background: transparent;
    border: none;
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
  }

  .close-button:hover {
    background: var(--hover-color, #f3f4f6);
  }
</style>
