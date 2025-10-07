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
  toolCall?: {
    name: string;
    query: string;
  };
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

    setToolCall: (messageId: string, toolCall: { name: string; query: string; }) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, toolCall }
            : msg
        )
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
            stored_name: f.stored_name,
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

        let mode: ChatMessage['mode'] = 'default';
        let codeModeContent: CodeModeContent | null = null;
        try {
          const parsed = JSON.parse(msg.response);
          if (parsed && typeof parsed === 'object' && ('Files' in parsed || 'Conclusion' in parsed)) {
            mode = 'code';
            codeModeContent = parsed;
          }
        } catch (e) { /* Not a JSON object */ }

        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'ai',
          content: msg.response,
          timestamp: new Date(msg.timestamp),
          mode: mode,
          codeModeContent: codeModeContent
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