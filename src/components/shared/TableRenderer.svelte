<script lang="ts">
  import { Download } from 'lucide-svelte';
  
  export let html: string = '';

  function downloadCSV() {
    // Create a temporary DOM element to parse the table
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const table = tempDiv.querySelector('table');
    
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const csvContent = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
        let text = cell.textContent?.trim() || '';
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          text = `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'table_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="table-wrapper">
  <div class="table-container">
    {@html html}
  </div>
  <button class="csv-download-btn" on:click={downloadCSV} title="Download as CSV">
    <Download size={14} />
    <span>CSV</span>
  </button>
</div>

<style>
  .table-wrapper {
    position: relative;
    margin: 1.25rem 0;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    /* Light mode default: darker creamish to match warm theme */
    background-color: #F2F0ED; 
  }

  /* Dark mode override: slightly lighter than background #1a1a1a */
  :global([data-theme="dark"]) .table-wrapper {
    background-color: #262626;
  }

  .table-container {
    overflow-x: auto;
    width: 100%;
  }

  /* CSV Button */
  .csv-download-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 0.7rem;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .table-wrapper:hover .csv-download-btn {
    opacity: 1;
  }

  .csv-download-btn:hover {
    background: var(--hover-color);
    color: var(--text-color);
    border-color: var(--text-muted);
  }

  /* Table Styles */
  :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    background: transparent;
  }

  :global(th),
  :global(td) {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    /* Vertical lines */
    border-right: 1px solid var(--border-color);
  }

  :global(th:last-child),
  :global(td:last-child) {
    border-right: none; /* No right border for last column */
  }

  :global(th) {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-muted);
    /* Light mode header: subtle darken */
    background-color: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid var(--border-color);
  }

  :global([data-theme="dark"]) :global(th) {
    /* Dark mode header: subtle lighten */
    background-color: rgba(255, 255, 255, 0.02);
  }

  :global(tr:last-child td) {
    border-bottom: none; /* Remove bottom border from last row */
  }

  :global(tbody tr:hover) {
    background-color: var(--hover-color);
  }
</style>
