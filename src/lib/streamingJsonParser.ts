export interface StreamingCodeState {
  fieldContents: {
    Text?: string;
    Files: Array<{ 
      FileName?: string;
      FileCode?: string;
      FileText?: string;
    }>;
    Conclusion?: string;
  };
  isComplete: boolean;
}

export interface ParserCallbacks {
  onFieldStart?: (field: string, fileIndex: number) => void;
  onFieldContent?: (field: string, contentChunk: string, fileIndex: number) => void;
  onFieldEnd?: (field: string, fileIndex: number) => void;
  onFileStart?: (fileIndex: number) => void;
  onParsingComplete?: () => void;
}

enum State {
  Idle,
  ExpectKey,
  ParsingKey,
  ExpectColon,
  ExpectValue,
  ParsingString,
  ParsingFilesArray,
  ParsingFileObject,
}

export class StreamingJsonParser {
  private state: State = State.Idle;
  private buffer: string = '';
  private key: string = '';
  private fileIndex: number = -1;
  private keyStack: string[] = [];

  private streamingState: StreamingCodeState = {
    fieldContents: { Files: [] },
    isComplete: false,
  };
  private callbacks: ParserCallbacks = {};

  public setCallbacks(callbacks: ParserCallbacks) {
    this.callbacks = callbacks;
  }

  public processChunk(chunk: string) {
    this.buffer += chunk;
    this.parse();
  }

  public getState(): StreamingCodeState {
    return this.streamingState;
  }

  public reset() {
    this.state = State.Idle;
    this.buffer = '';
    this.key = '';
    this.fileIndex = -1;
    this.keyStack = [];
    this.streamingState = {
      fieldContents: { Files: [] },
      isComplete: false,
    };
  }

  private parse() {
    while (this.buffer.length > 0) {
      const char = this.buffer[0];
      this.buffer = this.buffer.slice(1);

      switch (this.state) {
        case State.Idle:
          if (char === '{') this.state = State.ExpectKey;
          break;

        case State.ExpectKey:
          if (char === '"') {
            this.key = '';
            this.state = State.ParsingKey;
          } else if (char === '}') {
            this.state = State.Idle;
            this.streamingState.isComplete = true;
            this.callbacks.onParsingComplete?.();
          }
          break;

        case State.ParsingKey:
          if (char === '"') {
            this.state = State.ExpectColon;
          } else {
            this.key += char;
          }
          break;

        case State.ExpectColon:
          if (char === ':') this.state = State.ExpectValue;
          break;

        case State.ExpectValue:
          if (char === '"') {
            this.state = State.ParsingString;
            this.callbacks.onFieldStart?.(this.key, this.fileIndex);
          } else if (char === '[') {
            if (this.key === 'Files') {
              this.state = State.ParsingFilesArray;
              this.keyStack.push(this.key);
            }
          }
          break;

        case State.ParsingString:
          if (char === '\\') {
            if (this.buffer.length > 0) {
              const nextChar = this.buffer[0];
              this.buffer = this.buffer.slice(1);
              let unescaped = nextChar;
              switch (nextChar) {
                case 'n': unescaped = '\n'; break;
                case 't': unescaped = '\t'; break;
                case 'r': unescaped = '\r'; break;
                case 'b': unescaped = '\b'; break;
                case 'f': unescaped = '\f'; break;
                case '"': unescaped = '"'; break;
                case '\\': unescaped = '\\'; break;
                case '/': unescaped = '/'; break;
              }
              this.appendContent(unescaped);
            }
          } else if (char === '"') {
            this.callbacks.onFieldEnd?.(this.key, this.fileIndex);
            this.state = this.keyStack.includes('Files') ? State.ParsingFileObject : State.ExpectKey;
          } else {
            this.appendContent(char);
          }
          break;

        case State.ParsingFilesArray:
          if (char === '{') {
            this.fileIndex++;
            this.streamingState.fieldContents.Files.push({});
            this.callbacks.onFileStart?.(this.fileIndex);
            this.state = State.ParsingFileObject;
          } else if (char === ']') {
            this.keyStack.pop();
            this.state = State.ExpectKey;
          }
          break;

        case State.ParsingFileObject:
           if (char === '"') {
            this.key = '';
            this.state = State.ParsingKey;
          } else if (char === '}') {
            this.state = State.ParsingFilesArray;
          }
          break;
      }
    }
  }

  private appendContent(chunk: string) {
    this.callbacks.onFieldContent?.(this.key, chunk, this.fileIndex);
    if (this.keyStack.includes('Files')) {
      if (!this.streamingState.fieldContents.Files[this.fileIndex][this.key]) {
        this.streamingState.fieldContents.Files[this.fileIndex][this.key] = '';
      }
      this.streamingState.fieldContents.Files[this.fileIndex][this.key] += chunk;
    } else {
      if (!this.streamingState.fieldContents[this.key]) {
        this.streamingState.fieldContents[this.key] = '';
      }
      this.streamingState.fieldContents[this.key] += chunk;
    }
  }
}