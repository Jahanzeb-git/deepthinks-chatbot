import katex from 'katex';

export function renderMath(node: HTMLElement) {
  const render = () => {
    const mathElements = node.querySelectorAll('.math-inline, .math-display');
    mathElements.forEach((el) => {
      if (el.getAttribute('data-rendered') === 'true') return;
      const tex = el.textContent;
      const displayMode = el.classList.contains('math-display');
      try {
        katex.render(tex, el as HTMLElement, { displayMode, throwOnError: false });
        el.setAttribute('data-rendered', 'true');
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        el.textContent = tex;
      }
    });
  };

  render();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        render();
        break;
      }
    }
  });

  observer.observe(node, { childList: true, subtree: true });

  return {
    destroy() {
      observer.disconnect();
    },
  };
}
