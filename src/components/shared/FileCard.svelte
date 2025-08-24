<script lang="ts">
  export let filename: string;
</script>

<div class="file-card">
  <span class="file-icon">📄</span>
  <span class="file-name">{filename}</span>
</div>

<style>
  .file-card {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--surface-color);
    margin: 0.5rem 0;
  }

  .file-icon {
    color: var(--text-muted);
  }

  .file-name {
    font-weight: 500;
  }
</style>
