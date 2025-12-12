import hljs from 'highlight.js';

export interface UserMessageSegment {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

// Map common language aliases to their proper names
const languageAliases: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
};

// Auto-detect language using highlight.js
function detectLanguage(code: string): string {
  try {
    const result = hljs.highlightAuto(code);
    // Only return detected language if confidence is high enough
    if (result.language && result.relevance > 5) {
      return result.language;
    }
  } catch (e) {
    console.warn('Language detection failed:', e);
  }
  return 'plaintext';
}

export function parseUserMessage(content: string): UserMessageSegment[] {
  const segments: UserMessageSegment[] = [];
  // More flexible regex: handles optional language, optional newline after language
  const codeBlockRegex = /```([\w+-]*)\s*\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }

    const rawLanguage = match[1]?.toLowerCase().trim() || '';
    const codeContent = match[2].trim();

    // Resolve language: use alias map, then original, then auto-detect
    let language: string;
    if (rawLanguage && rawLanguage !== 'plaintext' && rawLanguage !== 'text') {
      // User specified a real language - use alias map or the raw value
      language = languageAliases[rawLanguage] || rawLanguage;
    } else {
      // No language specified OR 'plaintext'/'text' - auto-detect
      language = detectLanguage(codeContent);
    }

    // Add code block
    segments.push({
      type: 'code',
      content: codeContent,
      language: language
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent
      });
    }
  }

  // If no code blocks found, return entire content as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content
    });
  }

  return segments;
}
