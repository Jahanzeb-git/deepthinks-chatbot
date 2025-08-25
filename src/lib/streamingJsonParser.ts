// src/lib/streamingJsonParser.ts
export interface StreamingCodeState {
  currentField: 'Text' | 'FileName' | 'FileCode' | 'FileText' | 'Conclusion' | null;
  fieldContents: {
    Text?: string;
    Files: Array<{
      FileName?: string;
      FileCode?: string;
      FileText?: string;
    }>;
    Conclusion?: string;
  };
  activeFileIndex: number;
  renderingStates: {
    textVisible: boolean;
    filesVisible: boolean[];
    conclusionVisible: boolean;
  };
  isComplete: boolean;
}

export class StreamingJsonParser {
  private buffer: string = '';
  private state: StreamingCodeState;
  private callbacks: {
    onFieldStart?: (field: string) => void;
    onFieldContent?: (field: string, content: string, isComplete: boolean) => void;
    onFileStart?: (fileIndex: number) => void;
    onParsingComplete?: () => void;
  } = {};

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): StreamingCodeState {
    return {
      currentField: null,
      fieldContents: {
        Files: []
      },
      activeFileIndex: -1,
      renderingStates: {
        textVisible: false,
        filesVisible: [],
        conclusionVisible: false
      },
      isComplete: false
    };
  }

  public setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public processChunk(chunk: string): StreamingCodeState {
    this.buffer += chunk;
    this.parseBuffer();
    return { ...this.state };
  }

  private parseBuffer(): void {
    // Look for field starts
    this.detectTextField();
    this.detectFilesArray();
    this.detectConclusionField();
    
    // Process current field content
    if (this.state.currentField) {
      this.extractFieldContent();
    }
  }

  private detectTextField(): void {
    if (this.state.currentField === null && this.buffer.includes('"Text":')) {
      const textStart = this.buffer.indexOf('"Text":');
      if (textStart !== -1) {
        this.state.currentField = 'Text';
        this.state.renderingStates.textVisible = true;
        this.callbacks.onFieldStart?.('Text');
      }
    }
  }

  private detectFilesArray(): void {
    if (this.buffer.includes('"Files":')) {
      const filesStart = this.buffer.indexOf('"Files":');
      if (filesStart !== -1) {
        this.detectFileFields();
      }
    }
  }

  private detectFileFields(): void {
    // Look for FileName in current or new file
    const fileNameMatches = [...this.buffer.matchAll(/"FileName"\s*:\s*"([^"]*)"/g)];
    
    fileNameMatches.forEach((match, index) => {
      if (index >= this.state.fieldContents.Files.length) {
        // New file detected
        this.state.fieldContents.Files.push({});
        this.state.renderingStates.filesVisible.push(false);
        this.state.activeFileIndex = index;
        this.callbacks.onFileStart?.(index);
      }
      
      if (!this.state.renderingStates.filesVisible[index]) {
        this.state.renderingStates.filesVisible[index] = true;
        this.state.fieldContents.Files[index].FileName = match[1];
        this.callbacks.onFieldContent?.('FileName', match[1], true);
      }
    });

    // Detect FileCode and FileText for current file
    if (this.state.activeFileIndex >= 0) {
      this.detectFileCodeField();
      this.detectFileTextField();
    }
  }

  private detectFileCodeField(): void {
    const fileCodePattern = /"FileCode"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(fileCodePattern);
    
    if (match && this.state.currentField !== 'FileCode') {
      this.state.currentField = 'FileCode';
      this.callbacks.onFieldStart?.('FileCode');
    }
  }

  private detectFileTextField(): void {
    const fileTextPattern = /"FileText"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(fileTextPattern);
    
    if (match && this.state.currentField !== 'FileText') {
      this.state.currentField = 'FileText';
      this.callbacks.onFieldStart?.('FileText');
    }
  }

  private detectConclusionField(): void {
    if (this.buffer.includes('"Conclusion":')) {
      const conclusionStart = this.buffer.indexOf('"Conclusion":');
      if (conclusionStart !== -1 && this.state.currentField !== 'Conclusion') {
        this.state.currentField = 'Conclusion';
        this.state.renderingStates.conclusionVisible = true;
        this.callbacks.onFieldStart?.('Conclusion');
      }
    }
  }

  private extractFieldContent(): void {
    switch (this.state.currentField) {
      case 'Text':
        this.extractTextContent();
        break;
      case 'FileCode':
        this.extractFileCodeContent();
        break;
      case 'FileText':
        this.extractFileTextContent();
        break;
      case 'Conclusion':
        this.extractConclusionContent();
        break;
    }
  }

  private extractTextContent(): void {
    const pattern = /"Text"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(pattern);
    
    if (match) {
      const content = this.unescapeString(match[1]);
      this.state.fieldContents.Text = content;
      const isComplete = this.buffer.includes('"Text":"' + match[1] + '"');
      this.callbacks.onFieldContent?.('Text', content, isComplete);
      
      if (isComplete) {
        this.state.currentField = null;
      }
    }
  }

  private extractFileCodeContent(): void {
    const pattern = /"FileCode"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(pattern);
    
    if (match && this.state.activeFileIndex >= 0) {
      const content = this.unescapeString(match[1]);
      this.state.fieldContents.Files[this.state.activeFileIndex].FileCode = content;
      const isComplete = this.isFieldComplete('FileCode', match[1]);
      this.callbacks.onFieldContent?.('FileCode', content, isComplete);
      
      if (isComplete) {
        this.state.currentField = null;
      }
    }
  }

  private extractFileTextContent(): void {
    const pattern = /"FileText"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(pattern);
    
    if (match && this.state.activeFileIndex >= 0) {
      const content = this.unescapeString(match[1]);
      this.state.fieldContents.Files[this.state.activeFileIndex].FileText = content;
      const isComplete = this.isFieldComplete('FileText', match[1]);
      this.callbacks.onFieldContent?.('FileText', content, isComplete);
      
      if (isComplete) {
        this.state.currentField = null;
      }
    }
  }

  private extractConclusionContent(): void {
    const pattern = /"Conclusion"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/;
    const match = this.buffer.match(pattern);
    
    if (match) {
      const content = this.unescapeString(match[1]);
      this.state.fieldContents.Conclusion = content;
      const isComplete = this.isFieldComplete('Conclusion', match[1]);
      this.callbacks.onFieldContent?.('Conclusion', content, isComplete);
      
      if (isComplete) {
        this.state.currentField = null;
        this.checkIfParsingComplete();
      }
    }
  }

  private isFieldComplete(fieldName: string, rawContent: string): boolean {
    // Check if the field has a closing quote and proper JSON structure
    const fieldPattern = new RegExp(`"${fieldName}"\\s*:\\s*"${this.escapeRegex(rawContent)}"`);
    return fieldPattern.test(this.buffer);
  }

  private checkIfParsingComplete(): void {
    // Simple heuristic: check if buffer ends with }
    if (this.buffer.trim().endsWith('}')) {
      this.state.isComplete = true;
      this.callbacks.onParsingComplete?.();
    }
  }

  private unescapeString(str: string): string {
    return str.replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  public reset(): void {
    this.buffer = '';
    this.state = this.getInitialState();
  }

  public getState(): StreamingCodeState {
    return { ...this.state };
  }
}