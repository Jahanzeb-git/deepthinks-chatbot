// src/lib/simple-code-parser.ts

export interface ContentSegment {
  id: string;
  type: 'text' | 'code' | 'inline-code';
  content: string;
  language?: string;
}

enum ParserState {
  TEXT,
  LANGUAGE_LINE,
  CODE_CONTENT,
  INLINE_CODE
}

export class SimpleCodeParser {
  private segments: ContentSegment[] = [];
  private position = 0;
  private state: ParserState = ParserState.TEXT;
  private segmentIdCounter = 0;
  private languageBuffer = '';
  private backtickBuffer = '';

  parse(fullContent: string): ContentSegment[] {
    // Reset if content is shorter (new message)
    if (fullContent.length < this.position) {
      this.reset();
    }

    // Process only new content character by character
    const newContent = fullContent.slice(this.position);
    
    for (let i = 0; i < newContent.length; i++) {
      const char = newContent[i];
      
      // Accumulate backticks
      if (char === '`') {
        this.backtickBuffer += '`';
        continue;
      }
      
      // Process accumulated backticks when we hit a non-backtick
      if (this.backtickBuffer.length > 0) {
        this.processBackticks(char);
      }
      
      // Process the current character based on state
      this.processCharacter(char);
    }
    
    this.position = fullContent.length;
    return this.segments;
  }

  private processBackticks(nextChar: string) {
    const count = this.backtickBuffer.length;
    
    if (count >= 3) {
      // Triple backticks - code block delimiter
      if (this.state === ParserState.TEXT) {
        // Start code block
        this.state = ParserState.LANGUAGE_LINE;
        this.languageBuffer = '';
      } else if (this.state === ParserState.CODE_CONTENT) {
        // End code block - remove trailing newline if present
        const lastSegment = this.segments[this.segments.length - 1];
        if (lastSegment && lastSegment.type === 'code' && lastSegment.content.endsWith('\n')) {
          lastSegment.content = lastSegment.content.slice(0, -1);
        }
        this.state = ParserState.TEXT;
      } else if (this.state === ParserState.LANGUAGE_LINE) {
        // Edge case: ``` immediately after ``` (empty language)
        this.segments.push({
          id: `code-${this.segmentIdCounter++}`,
          type: 'code',
          content: '',
          language: ''
        });
        this.state = ParserState.CODE_CONTENT;
      }
    } else if (count === 1) {
      // Single backtick - inline code
      if (this.state === ParserState.TEXT) {
        this.state = ParserState.INLINE_CODE;
        this.segments.push({
          id: `inline-${this.segmentIdCounter++}`,
          type: 'inline-code',
          content: ''
        });
      } else if (this.state === ParserState.INLINE_CODE) {
        this.state = ParserState.TEXT;
      } else if (this.state === ParserState.CODE_CONTENT) {
        // Backtick inside code block - add it
        this.addToCodeSegment('`');
      } else if (this.state === ParserState.LANGUAGE_LINE) {
        // Backtick in language line
        this.languageBuffer += '`';
      }
    } else if (count === 2) {
      // Two backticks - add as literal text
      if (this.state === ParserState.TEXT) {
        this.addToTextSegment('``');
      } else if (this.state === ParserState.CODE_CONTENT) {
        this.addToCodeSegment('``');
      } else if (this.state === ParserState.INLINE_CODE) {
        this.addToInlineCodeSegment('``');
      } else if (this.state === ParserState.LANGUAGE_LINE) {
        this.languageBuffer += '``';
      }
    }
    
    this.backtickBuffer = '';
  }

  private processCharacter(char: string) {
    switch (this.state) {
      case ParserState.TEXT:
        this.addToTextSegment(char);
        break;
        
      case ParserState.LANGUAGE_LINE:
        if (char === '\n') {
          // Language line complete, create code segment
          this.segments.push({
            id: `code-${this.segmentIdCounter++}`,
            type: 'code',
            content: '',
            language: this.languageBuffer.trim()
          });
          this.state = ParserState.CODE_CONTENT;
          this.languageBuffer = '';
        } else {
          this.languageBuffer += char;
        }
        break;
        
      case ParserState.CODE_CONTENT:
        this.addToCodeSegment(char);
        break;
        
      case ParserState.INLINE_CODE:
        this.addToInlineCodeSegment(char);
        break;
    }
  }

  private addToTextSegment(text: string) {
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment && lastSegment.type === 'text') {
      lastSegment.content += text;
    } else {
      this.segments.push({
        id: `text-${this.segmentIdCounter++}`,
        type: 'text',
        content: text
      });
    }
  }

  private addToCodeSegment(text: string) {
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment && lastSegment.type === 'code') {
      lastSegment.content += text;
    }
  }

  private addToInlineCodeSegment(text: string) {
    const lastSegment = this.segments[this.segments.length - 1];
    if (lastSegment && lastSegment.type === 'inline-code') {
      lastSegment.content += text;
    }
  }

  reset() {
    this.segments = [];
    this.position = 0;
    this.state = ParserState.TEXT;
    this.segmentIdCounter = 0;
    this.languageBuffer = '';
    this.backtickBuffer = '';
  }

  getSegments(): ContentSegment[] {
    return this.segments;
  }
}