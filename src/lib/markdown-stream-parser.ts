// src/lib/markdown-stream-parser.ts

export interface CodeBlockChunk {
  type: 'code';
  id: string;
  language: string;
  code: string;
  isComplete: boolean;
}

export interface TextChunk {
  type: 'text';
  id: string;
  content: string;
}

export interface InlineCodeChunk {
  type: 'inline-code';
  id: string;
  code: string;
  isComplete: boolean;
}

export type ContentChunk = CodeBlockChunk | TextChunk | InlineCodeChunk;

export class MarkdownStreamParser {
  private chunks: ContentChunk[] = [];
  private buffer = '';
  private inCodeBlock = false;
  private inInlineCode = false;
  private codeLanguage = '';
  private codeContent = '';
  private backtickCount = 0;
  private idCounter = 0;

  parse(fullContent: string): ContentChunk[] {
    // If content is shorter than buffer, we're dealing with a reset - start fresh
    if (fullContent.length < this.buffer.length) {
      this.reset();
    }

    // Only process new content
    const newContent = fullContent.slice(this.buffer.length);
    this.buffer = fullContent;

    for (let i = 0; i < newContent.length; i++) {
      const char = newContent[i];
      const remaining = newContent.slice(i);

      // Check for code block start/end (```)
      if (char === '`') {
        // Count consecutive backticks
        let count = 1;
        let j = i + 1;
        while (j < newContent.length && newContent[j] === '`') {
          count++;
          j++;
        }

        if (count >= 3 && !this.inInlineCode) {
          // This is a code block delimiter
          if (!this.inCodeBlock) {
            // Starting a code block
            this.finalizeCurrentChunk();
            this.inCodeBlock = true;
            this.backtickCount = count;
            
            // Extract language (everything until newline after backticks)
            let langEnd = j;
            while (langEnd < newContent.length && newContent[langEnd] !== '\n') {
              langEnd++;
            }
            this.codeLanguage = newContent.slice(j, langEnd).trim();
            this.codeContent = '';
            
            // Skip past the opening sequence
            i = langEnd;
            continue;
          } else {
            // Potentially ending a code block - must match opening backtick count
            if (count === this.backtickCount) {
              // Ending code block
              this.chunks.push({
                type: 'code',
                id: `code-${this.idCounter++}`,
                language: this.codeLanguage,
                code: this.codeContent,
                isComplete: true
              });
              
              this.inCodeBlock = false;
              this.codeLanguage = '';
              this.codeContent = '';
              this.backtickCount = 0;
              
              // Skip past the closing sequence
              i = j - 1;
              continue;
            } else {
              // Not matching backticks, add to code content
              this.codeContent += '`'.repeat(count);
              i = j - 1;
              continue;
            }
          }
        } else if (count === 1 && !this.inCodeBlock) {
          // Single backtick - inline code
          if (!this.inInlineCode) {
            this.finalizeCurrentChunk();
            this.inInlineCode = true;
            this.codeContent = '';
          } else {
            // Ending inline code
            this.chunks.push({
              type: 'inline-code',
              id: `inline-${this.idCounter++}`,
              code: this.codeContent,
              isComplete: true
            });
            this.inInlineCode = false;
            this.codeContent = '';
          }
          i = j - 1;
          continue;
        }
      }

      // Add character to appropriate buffer
      if (this.inCodeBlock) {
        this.codeContent += char;
      } else if (this.inInlineCode) {
        this.codeContent += char;
      } else {
        // Regular text - add to last text chunk or create new one
        if (this.chunks.length === 0 || this.chunks[this.chunks.length - 1].type !== 'text') {
          this.chunks.push({
            type: 'text',
            id: `text-${this.idCounter++}`,
            content: char
          });
        } else {
          (this.chunks[this.chunks.length - 1] as TextChunk).content += char;
        }
      }
    }

    // Handle incomplete blocks at the end
    if (this.inCodeBlock) {
      // Update or create incomplete code block
      const lastChunk = this.chunks[this.chunks.length - 1];
      if (lastChunk && lastChunk.type === 'code' && !lastChunk.isComplete) {
        lastChunk.code = this.codeContent;
        lastChunk.language = this.codeLanguage;
      } else {
        this.chunks.push({
          type: 'code',
          id: `code-${this.idCounter++}`,
          language: this.codeLanguage,
          code: this.codeContent,
          isComplete: false
        });
      }
    } else if (this.inInlineCode) {
      const lastChunk = this.chunks[this.chunks.length - 1];
      if (lastChunk && lastChunk.type === 'inline-code' && !lastChunk.isComplete) {
        lastChunk.code = this.codeContent;
      } else {
        this.chunks.push({
          type: 'inline-code',
          id: `inline-${this.idCounter++}`,
          code: this.codeContent,
          isComplete: false
        });
      }
    }

    return this.chunks;
  }

  private finalizeCurrentChunk() {
    // Mark last chunk as complete if it was incomplete
    if (this.chunks.length > 0) {
      const last = this.chunks[this.chunks.length - 1];
      if (last.type === 'code' && !last.isComplete) {
        last.isComplete = true;
      } else if (last.type === 'inline-code' && !last.isComplete) {
        last.isComplete = true;
      }
    }
  }

  reset() {
    this.chunks = [];
    this.buffer = '';
    this.inCodeBlock = false;
    this.inInlineCode = false;
    this.codeLanguage = '';
    this.codeContent = '';
    this.backtickCount = 0;
    this.idCounter = 0;
  }

  getChunks(): ContentChunk[] {
    return this.chunks;
  }
}
