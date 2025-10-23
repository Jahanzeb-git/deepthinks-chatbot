import { writable } from 'svelte/store';

export interface CodeModeContent {
  Text?: string;
  Files: Array<{ 
    FileName?: string;
    FileVersion?: number;
    FileCode?: string;
    FileText?: string;
  }>;
  Conclusion?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  interrupted?: boolean;
  tokenCount?: number;
  model?: string;
  mode?: 'default' | 'reason' | 'code';
  codeModeContent?: CodeModeContent;
  toolCalls?: {
    name: string;
    query: string;
    position?: 'after_text' | 'after_file' | 'before_conclusion';
    fileIndex?: number; 
    urls?: Array<{ title: string; url: string }>; 
    isLoading?: boolean; 
  }[];
}

export const isCodingMode = writable(false);

export interface ChatState {
  messages: ChatMessage[];
  isInitialState: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  isCreatingNewConversation: boolean;
  currentStreamingId: string | null;
}

const initialState: ChatState = {
  messages: [],
  isInitialState: true,
  isLoading: false,
  isStreaming: false,
  isCreatingNewConversation: false,
  currentStreamingId: null
};

function createChatStore() {
  const { subscribe, set, update } = writable<ChatState>(initialState);

  const updateCodeContent = (messageId: string, updateFn: (content: CodeModeContent) => void) => {
    update(state => {
      const newMessages = state.messages.map(msg => {
        if (msg.id === messageId && msg.mode === 'code') {
          const newMsg = { ...msg };
          if (!newMsg.codeModeContent) {
            newMsg.codeModeContent = { Files: [] };
          }
          updateFn(newMsg.codeModeContent);
          return newMsg;
        }
        return msg;
      });
      return { ...state, messages: newMessages };
    });
  };

  return {
    subscribe,
    addUserMessage: (content: string) => {
      const messageId = crypto.randomUUID();
      update(state => ({
        ...state,
        messages: [...state.messages, {
          id: messageId,
          type: 'user',
          content,
          timestamp: new Date()
        }],
        isInitialState: false
      }));
      return messageId;
    },

    startAIResponse: (model: string, mode: 'default' | 'reason' | 'code') => {
      const messageId = crypto.randomUUID();
      const message: ChatMessage = {
        id: messageId,
        type: 'ai' as const,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        model: model,
        mode: mode,
        toolCalls: [],
        ...(mode === 'code' && { codeModeContent: { Files: [] } })
      };

      update(state => ({
        ...state,
        messages: [...state.messages, message],
        isLoading: true,
        isStreaming: true,
        currentStreamingId: messageId
      }));
      return messageId;
    },

    addFileToCodeMessage: (messageId: string, fileIndex: number) => {
      updateCodeContent(messageId, content => {
        if (!content.Files[fileIndex]) {
          content.Files[fileIndex] = {};
        }
      });
    },
    appendCodeModeText: (messageId: string, chunk: string) => {
      updateCodeContent(messageId, content => {
        content.Text = (content.Text || '') + chunk;
      });
    },
    appendCodeModeFileName: (messageId: string, fileIndex: number, chunk: string) => {
      updateCodeContent(messageId, content => {
        content.Files[fileIndex].FileName = (content.Files[fileIndex].FileName || '') + chunk;
      });
    },
    appendCodeModeFileVersion: (messageId: string, fileIndex: number, chunk: string) => {
      updateCodeContent(messageId, content => {
        const version = parseInt(chunk);
        if (!isNaN(version)) {
          content.Files[fileIndex].FileVersion = version;
        }
      });
    },
    appendCodeModeFileCode: (messageId: string, fileIndex: number, chunk: string) => {
      updateCodeContent(messageId, content => {
        content.Files[fileIndex].FileCode = (content.Files[fileIndex].FileCode || '') + chunk;
      });
    },
    appendCodeModeFileText: (messageId: string, fileIndex: number, chunk: string) => {
      updateCodeContent(messageId, content => {
        content.Files[fileIndex].FileText = (content.Files[fileIndex].FileText || '') + chunk;
      });
    },
    appendCodeModeConclusion: (messageId: string, chunk: string) => {
      updateCodeContent(messageId, content => {
        content.Conclusion = (content.Conclusion || '') + chunk;
      });
    },

    addToolCall: (messageId: string, toolCall: { name: string; query: string; position?: string; fileIndex?: number  }) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, toolCalls: [...(msg.toolCalls || []), {...toolCall, isLoading: true, urls: [] }] }
            : msg
        )
      }));
    },

    updateToolCallUrls: (messageId: string, toolCallIndex: number, urls: Array<{ title: string; url: string }>) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === messageId && msg.toolCalls && msg.toolCalls[toolCallIndex]) {
            const updatedToolCalls = [...msg.toolCalls];
            updatedToolCalls[toolCallIndex] = {
              ...updatedToolCalls[toolCallIndex],
              urls,
              isLoading: false
            };
            return { ...msg, toolCalls: updatedToolCalls };
          }
          return msg;
        })
      }));
    },

    updateStreamingMessage: (messageId: string, content: string) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, content }
            : msg
        )
      }));
    },

    finishStreaming: (messageId: string, tokenCount: number = 0) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === messageId) {
            const finalContent = msg.mode === 'code' && msg.codeModeContent ? JSON.stringify(msg.codeModeContent, null, 2) : msg.content;
            return { 
              ...msg, 
              isStreaming: false, 
              tokenCount: tokenCount,
              content: finalContent
            };
          }
          return msg;
        }),
        currentStreamingId: null,
        isLoading: false,
        isStreaming: false
      }));
    },

    interruptStreaming: (messageId: string) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, isStreaming: false, interrupted: true }
            : msg
        ),
        currentStreamingId: null,
        isLoading: false,
        isStreaming: false
      }));
    },

    regenerateAIResponse: (aiMessageId: string) => {
      let userPrompt = '';
      update(state => {
        const aiMessageIndex = state.messages.findIndex(msg => msg.id === aiMessageId);
        if (aiMessageIndex > 0 && state.messages[aiMessageIndex - 1].type === 'user') {
          userPrompt = state.messages[aiMessageIndex - 1].content;
          state.messages.splice(aiMessageIndex, 1);
        }
        return state;
      });
      return userPrompt;
    },

    setLoading: (loading: boolean) => {
      update(state => ({ ...state, isLoading: loading }));
    },

    setCreatingNewConversation: (isCreating: boolean) => {
      update(state => ({ ...state, isCreatingNewConversation: isCreating }));
    },

    clearMessages: () => {
      update(state => ({
        ...state,
        ...initialState
      }));
    },

    loadSessionMessages: (messages: Array<{prompt: string, response: string, timestamp: string, files?: any[]}>) => {
      const chatMessages: ChatMessage[] = [];
      messages.forEach(msg => {
        let userContent = msg.prompt;

        // Handle file attachments from history
        if (msg.files && Array.isArray(msg.files) && msg.files.length > 0) {
          const fileMetadata = msg.files.map(f => ({
            id: f.id.toString(),
            original_name: f.original_name,
            b2_key: f.b2_key,
            size: f.size,
            type: f.mime_type, // Map mime_type to type
            is_image: Boolean(f.is_image), // Convert 0/1 to boolean
            uploaded_at: f.uploaded_at,
          }));

          userContent = JSON.stringify({
            prompt: msg.prompt,
            files: fileMetadata // Use plural `files`
          });
        }

        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'user',
          content: userContent,
          timestamp: new Date(msg.timestamp)
        });

        // Process AI message
        let mode: ChatMessage['mode'] = 'default';
        let codeModeContent: CodeModeContent | null = null;
        let content = msg.response;
        let toolCalls: ChatMessage['toolCalls'] = [];

        // STEP 1: First check if this is code mode
        try {
          const parsed = JSON.parse(msg.response);
          if (parsed && typeof parsed === 'object' && 
            ('Files' in parsed || 'Conclusion' in parsed || 'Text' in parsed)) {
            // This is code mode content
            mode = 'code';
            codeModeContent = parsed;
            content = JSON.stringify(parsed, null, 2);
          }
        } catch (e) {
          // Not code mode, continue
        }

        // STEP 2: Process search_web_calls (for both default AND code mode)
        if (msg.search_web_calls && Array.isArray(msg.search_web_calls) && msg.search_web_calls.length > 0) {
          const sortedCalls = msg.search_web_calls.sort((a: any, b: any) => a.sequence - b.sequence);

          sortedCalls.forEach((searchCall: any, index: number) => {
            const urls = searchCall.urls?.map((u: any) => ({
              title: u.title,
              url: u.url
            })) || [];

            const toolCall: any = {
              name: 'search_web',
              query: searchCall.query,
              urls,
              isLoading: false
            };

            // For code mode, infer position based on response structure
            if (mode === 'code' && codeModeContent) {
              // Parse the response to find tool call positions
              const responseText = msg.response;
      
              // Check if tool_after_text exists and matches this query
              if (responseText.includes('"tool_after_text"') && 
                responseText.includes(`"query": "${searchCall.query}"`)) {
                toolCall.position = 'after_text';
              }
                // Check if tool_before_conclusion exists and matches this query
              else if (responseText.includes('"tool_before_conclusion"') && 
                responseText.includes(`"query": "${searchCall.query}"`)) {
                toolCall.position = 'before_conclusion';
              }
              // Otherwise, assume it's after a file
              else {
                toolCall.position = 'after_file';
                toolCall.fileIndex = index;
              }
            }

            toolCalls.push(toolCall);
          });

          // For default mode, add markers if they don't exist
          if (mode === 'default' && toolCalls.length > 0 && !content.includes('<--tool-call-->')) {
            const parts = [content];
            for (let i = 0; i < toolCalls.length - 1; i++) {
              parts.push('');
            }
            content = parts.join('<--tool-call-->');
          }
        }

        // STEP 3: Handle embedded tool calls (old format) ONLY if mode is still 'default'
        if (mode === 'default') {
          const toolCallStartTag = '{"tool_call":';
          if (msg.response.includes(toolCallStartTag)) {
            const parts = [];
            let remainingText = msg.response;
            let startIndex = remainingText.indexOf(toolCallStartTag);

            while (startIndex !== -1) {
              parts.push(remainingText.substring(0, startIndex));
      
              let openBraces = 0;
              let endIndex = -1;
              for (let i = startIndex; i < remainingText.length; i++) {
                if (remainingText[i] === '{') {
                  openBraces++;
                } else if (remainingText[i] === '}') {
                  openBraces--;
                  if (openBraces === 0) {
                    endIndex = i + 1;
                    break;
                  }
                }
              }

              if (endIndex !== -1) {
                const jsonStr = remainingText.substring(startIndex, endIndex);
                try {
                  const parsedTool = JSON.parse(jsonStr);
                  if (parsedTool.tool_call && parsedTool.query) {
                    // Only add if not already in toolCalls (to avoid duplicates)
                    const alreadyExists = toolCalls.some(tc => tc.query === parsedTool.query);
                    if (!alreadyExists) {
                      toolCalls.push({ 
                        name: parsedTool.tool_call, 
                        query: parsedTool.query,
                        urls: [],
                        isLoading: false
                      });
                    }
                    remainingText = remainingText.substring(endIndex);
                  } else {
                    parts.push(jsonStr);
                    remainingText = remainingText.substring(endIndex);
                  }
                } catch {
                  parts.push(jsonStr);
                  remainingText = remainingText.substring(endIndex);
                }
              } else {
                parts.push(remainingText.substring(startIndex));
                remainingText = '';
                break;
              }
              startIndex = remainingText.indexOf(toolCallStartTag);
            }
            parts.push(remainingText);
            content = parts.join('<--tool-call-->');
          }
        }

        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'ai',
          content: content,
          timestamp: new Date(msg.timestamp),
          mode: mode,
          codeModeContent: codeModeContent,
          toolCalls: toolCalls
        });
        
      });
      
      update(state => ({
        ...state,
        messages: chatMessages,
        isInitialState: chatMessages.length === 0,
        isLoading: false,
        isStreaming: false,
        isCreatingNewConversation: false,
        currentStreamingId: null
      }));
    }
  };
}

export const chatStore = createChatStore();

isCodingMode.subscribe(isCoding => {
});