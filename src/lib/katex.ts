import katex from 'katex';

export function renderMath(node: HTMLElement) {
  let debounceTimer: number | null = null;
  let isRendering = false;

  const render = () => {
    if (isRendering) return;
    isRendering = true;

    try {
      const mathElements = node.querySelectorAll('.math-inline, .math-display');
      mathElements.forEach((el) => {
        if (el.getAttribute('data-rendered') === 'true') return;
        
        const tex = el.textContent?.trim();
        if (!tex) return;

        // Skip incomplete LaTeX expressions during streaming
        const displayMode = el.classList.contains('math-display');
        if (displayMode) {
          // For display math, check if expression seems complete
          const openBraces = (tex.match(/\{/g) || []).length;
          const closeBraces = (tex.match(/\}/g) || []).length;
          if (openBraces !== closeBraces) return; // Incomplete
        }

        const displayModeFlag = el.classList.contains('math-display');
        try {
          // Clear any existing content first
          el.innerHTML = '';
          
          katex.render(tex, el as HTMLElement, { 
            displayMode: displayModeFlag, 
            throwOnError: false,
            strict: false,
            trust: false
          });
          el.setAttribute('data-rendered', 'true');
        } catch (error) {
          console.error('KaTeX rendering error:', error);
          el.textContent = tex;
        }
      });
    } finally {
      isRendering = false;
    }
  };

  const debouncedRender = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      render();
      debounceTimer = null;
    }, 100); // Wait 100ms after last mutation
  };

  // Initial render
  render();

  const observer = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldRender = true;
        break;
      }
    }
    if (shouldRender) {
      debouncedRender();
    }
  });

  observer.observe(node, { childList: true, subtree: true });

  return {
    destroy() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      observer.disconnect();
    },
  };
}