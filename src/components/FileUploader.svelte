<script lang="ts">
  import { Upload, X, AlertCircle, FileCode, FileText, FileImage, File as FileIcon } from 'lucide-svelte';
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
      input.value = '';
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

  function getFileTypeInfo(type: string, name: string): { component: any; color: string } {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    // Images
    if (type.startsWith('image/')) {
      return { component: FileImage, color: '#10b981' };
    }
    
    // Programming languages
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sh', 'bash'];
    if (codeExts.includes(ext)) {
      return { component: FileCode, color: '#3b82f6' };
    }
    
    // Documents
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'md'];
    if (docExts.includes(ext)) {
      return { component: FileText, color: '#8b5cf6' };
    }
    
    // Default
    return { component: FileIcon, color: '#6b7280' };
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
    <div class="files-grid">
      {#each files as file, index (index)}
        {@const typeInfo = getFileTypeInfo(file.type, file.originalName)}
        <div class="file-card" class:error={file.uploadStatus === 'error'}>
          <button 
            class="remove-btn" 
            on:click={() => removeFile(index)}
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
          <div class="file-icon-wrapper" style="background-color: {typeInfo.color}15; color: {typeInfo.color};">
            <svelte:component this={typeInfo.component} size={20} />
          </div>
          <div class="file-info">
            <div class="file-name" title={file.originalName}>{file.originalName}</div>
            <div class="file-size">{formatBytes(file.size)}</div>
            {#if file.uploadStatus === 'error'}
              <div class="file-error">{file.error || 'Failed'}</div>
            {/if}
          </div>
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
      <Upload size={20} />
      <span class="upload-text">Add files (Max 5 • 10MB each)</span>
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

  .files-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    transition: all 0.2s ease;
    width: 110px;
    min-height: 100px;
  }

  .file-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .file-card.error {
    border-color: #dc2626;
    background: rgba(239, 68, 68, 0.05);
  }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    opacity: 0;
    z-index: 1;
  }

  .file-card:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background: #dc2626;
  }

  .file-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    min-width: 0;
  }

  .file-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .file-size {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .file-error {
    font-size: 0.65rem;
    color: #dc2626;
    font-weight: 500;
  }

  .upload-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
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
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-color);
  }

  @media (max-width: 768px) {
    .file-card {
      width: 95px;
      min-height: 90px;
      padding: 0.6rem;
    }

    .file-icon-wrapper {
      width: 36px;
      height: 36px;
    }

    .file-name {
      font-size: 0.7rem;
    }
  }
</style>