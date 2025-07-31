import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true
});

export function renderMarkdown(content: string): string {
  const html = marked(content);
  return DOMPurify.sanitize(html, { ADD_TAGS: ['thinking'] });
}