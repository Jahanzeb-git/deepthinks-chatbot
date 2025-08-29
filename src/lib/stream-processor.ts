export interface StreamProcessorCallbacks {
  onTextChunk?: (chunk: string) => void;
  onFileNameChunk?: (chunk: string, fileIndex: number) => void;
  onFileVersionChunk?: (chunk: string, fileIndex: number) => void;
  onFileCodeChunk?: (chunk: string, fileIndex: number) => void;
  onFileTextChunk?: (chunk: string, fileIndex: number) => void;
  onConclusionChunk?: (chunk: string) => void;
  onFileStart?: (fileIndex: number) => void;
  onComplete?: () => void;
}

enum State {
  Idle,             // Looking for a key
  StreamingValue,    // Streaming the value of a found key
}

export class StreamProcessor {
  private state: State = State.Idle;
  private buffer: string = '';
  private currentKey: string = '';
  private fileIndex: number = -1;
  private callbacks: StreamProcessorCallbacks = {};

  public setCallbacks(callbacks: StreamProcessorCallbacks) {
    this.callbacks = callbacks;
  }

  public process(chunk: string) {
    this.buffer += chunk;
    this.parse();
  }
  
  public close() {
    this.callbacks.onComplete?.();
  }

  private parse() {
    while (this.buffer.length > 0) {
      if (this.state === State.Idle) {
        const keyMatch = this.buffer.match(/.{1}"(Text|FileName|FileVersion|FileCode|FileText|Conclusion)"\s*:\s*"/);
        if (!keyMatch) return; // Not enough data to find a key, wait for more. 

        this.currentKey = keyMatch[1];
        const valueStartIndex = keyMatch.index + keyMatch[0].length;
        this.buffer = this.buffer.slice(valueStartIndex);
        
        if (this.currentKey === 'FileName') {
            this.fileIndex++;
            this.callbacks.onFileStart?.(this.fileIndex);
        }
        this.state = State.StreamingValue;
      }

      if (this.state === State.StreamingValue) {
        let valueChunk = '';
        let valueEndFound = false;

        while (this.buffer.length > 0) {
          const char = this.buffer[0];
          this.buffer = this.buffer.slice(1);

          if (char === '\\') {
            if (this.buffer.length > 0) {
              const nextChar = this.buffer[0];
              this.buffer = this.buffer.slice(1);
              switch (nextChar) {
                case 'n': valueChunk += '\n'; break;
                case 't': valueChunk += '\t'; break;
                case '"': valueChunk += '"'; break;
                case '\\': valueChunk += '\\'; break;
                default: valueChunk += char + nextChar; break;
              }
            } else {
              this.buffer = char + this.buffer; // Put dangling escape back
              break; 
            }
          } else if (char === '"') {
            valueEndFound = true;
            break;
          } else {
            valueChunk += char;
          }
        }

        if (valueChunk) {
          this.emitChunk(valueChunk);
        }

        if (valueEndFound) {
          this.state = State.Idle;
        } else {
          return;
        }
      }
    }
  }

  private emitChunk(unescapedChunk: string) {
    if (!unescapedChunk) return;

    switch (this.currentKey) {
      case 'Text':
        this.callbacks.onTextChunk?.(unescapedChunk);
        break;
      case 'FileName':
        this.callbacks.onFileNameChunk?.(unescapedChunk, this.fileIndex);
        break;
      case 'FileCode':
        this.callbacks.onFileCodeChunk?.(unescapedChunk, this.fileIndex);
        break;
      case 'FileText':
        this.callbacks.onFileTextChunk?.(unescapedChunk, this.fileIndex);
        break;
      case 'Conclusion':
        this.callbacks.onConclusionChunk?.(unescapedChunk);
        break;
      case 'FileVersion':
        this.callbacks.onFileVersionChunk?.(unescapedChunk, this.fileIndex);
        break;
    }
  }
}