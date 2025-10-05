<script lang="ts">
  import { Upload, File as FileIcon, X, AlertCircle } from 'lucide-svelte';
  import { fileStore } from '../stores/file';
  import { api } from '../lib/api';
  import { authStore } from '../stores/auth';

  let fileInput: HTMLInputElement;
  let dragActive = false;

  $: files = $fileStore.files;
  $: error = $fileStore.error;
  $: canAddMore = files.length < 5;

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      fileStore.addFiles(newFiles);
      input.value = ''; // Reset input
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      fileStore.addFiles(newFiles);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragActive = true;
  }

  function handleDragLeave() {
    dragActive = false;
  }

  function removeFile(index: number) {
    fileStore.removeFile(index);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  function getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('csv')) return '📊';
    if (type.includes('text')) return '📃';
    return '📎';
  }
</script>

<div class="file-uploader">
  {#if error}
    <div class="error-banner">
      <AlertCircle size={16} />
      <span>{error}</span>
      <button class="close-error" on:click={() => fileStore.clearError()}>
        <X size={14} />
      </button>
    </div>
  {/if}

  {#if files.length > 0}
    <div class="files-list">
      {#each files as file, index (index)}
        <div class="file-item" class:error={file.uploadStatus === 'error'}>
          <div class="file-icon">
            {getFileIcon(file.type)}
          </div>
          <div class="file-info">
            <div class="file-name">{file.originalName}</div>
            <div class="file-meta">
              <span class="file-size">{formatBytes(file.size)}</span>
              {#if file.uploadStatus === 'error'}
                <span class="file-status error">{file.error || 'Upload failed'}</span>
              {/if}
            </div>
          </div>
          <button 
            class="remove-btn" 
            on:click={() => removeFile(index)}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if canAddMore}
    <div 
      class="upload-area" 
      class:drag-active={dragActive}
      on:click={() => fileInput.click()}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      role="button"
      tabindex="0"
    >
      <Upload size={24} />
      <div class="upload-text">
        <span class="primary-text">Click or drag files here</span>
        <span class="secondary-text">Max 5 files • 10MB each</span>
      </div>
    </div>
  {/if}

  {#if files.length >= 5}
    <div class="max-files-notice">
      Maximum files reached (5/5)
    </div>
  {/if}

  <input 
    type="file" 
    bind:this={fileInput} 
    on:change={handleFileSelect}
    multiple
    style="display: none;"
    accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.py,.js,.java,.c,.cpp,.sh,.xlsx,.png,.jpg,.jpeg"
  />
</div>

<style>
  .file-uploader {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .close-error {
    margin-left: auto;
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 4px;
  }

  .close-error:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .file-item:hover {
    border-color: var(--primary-color);
    background: var(--hover-color);
  }

  .file-item.error {
    border-color: #dc2626;
    background: rgba(239, 68, 68, 0.05);
  }

  .file-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .file-status.error {
    color: #dc2626;
  }

  .remove-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  .upload-area {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--surface-color);
  }

  .upload-area:hover,
  .upload-area.drag-active {
    border-color: var(--primary-color);
    background: var(--primary-color-translucent);
  }

  .upload-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .primary-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
  }

  .secondary-text {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .max-files-notice {
    padding: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--hover-color);
    border-radius: 6px;
  }

  @media (max-width: 768px) {
    .upload-area {
      flex-direction: column;
      text-align: center;
      padding: 1.5rem 1rem;
    }
  }
</style>