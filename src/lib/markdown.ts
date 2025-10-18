import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Custom code block renderer
const codeRenderer = {
  name: 'code',
  level: 'block',
  renderer(token: any) {
    const lang = token.lang || '';
    const code = token.text || '';
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    return `<div class="code-block" data-language="${lang}" data-code="${escapedCode}"></div>`;
  }
};

const blockMath = {
  name: 'blockMath',
  level: 'block',
  start(src: string) { return src.indexOf('$$'); },
  tokenizer(src: string) {
    const rule = /^\$\$([\s\S]+?)\$\$/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1].trim()
      };
    }
  },
  renderer(token: any) {
    return `<div class="math-display">${token.text}</div>`;
  }
};

const inlineMath = {
  name: 'inlineMath',
  level: 'inline',
  start(src: string) { return src.indexOf('$'); },
  tokenizer(src: string) {
    const rule = /^\$([^\$\n]+?)\$/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[1].trim()
      };
    }
  },
  renderer(token: any) {
    return `<span class="math-inline">${token.text}</span>`;
  }
};

marked.use({ 
  extensions: [blockMath, inlineMath],
  renderer: {
    code: codeRenderer.renderer
  }
});

marked.setOptions({
  breaks: true,
  gfm: true
});

export function renderMarkdown(content: string): string {
  const html = marked(content) as string;
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['thinking', 'span', 'div'],
    ADD_ATTR: ['class', 'data-language', 'data-code']
  });
}