import katex from 'katex';

export function renderMath(node: HTMLElement) {
  const render = () => {
    const mathElements = node.querySelectorAll('.math-inline, .math-display');
    mathElements.forEach((el) => {
      const tex = el.textContent;
      const displayMode = el.classList.contains('math-display');
      try {
        katex.render(tex, el as HTMLElement, { displayMode, throwOnError: false });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        el.textContent = tex;
      }
    });
  };

  render();

  return {
    update: render,
  };
}
