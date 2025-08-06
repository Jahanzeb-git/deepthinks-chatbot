import { marked } from 'marked';
import DOMPurify from 'dompurify';

const blockMath = {
  name: 'blockMath',
  level: 'block',
  start(src) { return src.indexOf('$$'); },
  tokenizer(src) {
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
  renderer(token) {
    return `<div class="math-display">${token.text}</div>`;
  }
};

const inlineMath = {
  name: 'inlineMath',
  level: 'inline',
  start(src) { return src.indexOf('$'); },
  tokenizer(src) {
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
  renderer(token) {
    return `<span class="math-inline">${token.text}</span>`;
  }
};

marked.use({ extensions: [blockMath, inlineMath] });

marked.setOptions({
  breaks: true,
  gfm: true
});

export function renderMarkdown(content: string): string {
  const html = marked(content);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['thinking', 'span', 'div'],
    ADD_ATTR: ['class']
  });
}
