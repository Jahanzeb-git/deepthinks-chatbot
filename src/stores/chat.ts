import { writable } from 'svelte/store';
import { StreamingJsonParser, type StreamingCodeState } from '../lib/streamingJsonParser';

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
}

export interface StreamingCodeMessage extends ChatMessage {
  streamingState?: StreamingCodeState;
  parser?: StreamingJsonParser;
}

export const isCodingMode = writable(false);

export interface ChatState {
  messages: (ChatMessage | StreamingCodeMessage)[];
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
      const baseMessage = {
        id: messageId,
        type: 'ai' as const,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        model: model,
        mode: mode
      };

      const message = mode === 'code' 
        ? { 
            ...baseMessage, 
            streamingState: {
              currentField: null,
              fieldContents: { Files: [] },
              activeFileIndex: -1,
              renderingStates: { textVisible: false, filesVisible: [], conclusionVisible: false },
              isComplete: false
            } as StreamingCodeState,
            parser: new StreamingJsonParser()
          } as StreamingCodeMessage
        : baseMessage;

      update(state => ({
        ...state,
        messages: [...state.messages, message],
        isLoading: true,
        isStreaming: true,
        currentStreamingId: messageId
      }));
      return messageId;
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
    updateStreamingCodeMessage: (messageId: string, streamingState: StreamingCodeState) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId && msg.mode === 'code'
            ? { ...msg, streamingState } as StreamingCodeMessage
            : msg
        )
      }));
    },

    finishStreaming: (messageId: string, tokenCount: number = 0) => {
      update(state => {
        const newMessages = state.messages.map(msg => {
          if (msg.id === messageId) {
            // Create a new object to ensure reactivity
            const finalMsg: ChatMessage = {
              ...msg,
              isStreaming: false,
              tokenCount: tokenCount
            };

            // If it's a code message, finalize it
            if (finalMsg.mode === 'code' && 'streamingState' in finalMsg) {
              const codeMsg = finalMsg as StreamingCodeMessage;
              try {
                // Serialize the final parsed content
                finalMsg.content = JSON.stringify(codeMsg.streamingState.fieldContents);
              } catch {
                // Keep the raw content as a fallback
              }
              // Clean up streaming-specific properties to prevent race conditions
              delete codeMsg.streamingState;
              delete codeMsg.parser;
            }
            
            return finalMsg;
          }
          return msg;
        });

        return {
          ...state,
          messages: newMessages,
          currentStreamingId: null,
          isLoading: false,
          isStreaming: false
        };
      });
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
          // Remove the old AI message
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
        messages: [],
        isInitialState: true,
        isLoading: false,
        isStreaming: false,
        isCreatingNewConversation: false,
        currentStreamingId: null
      }));
    },
    loadSessionMessages: (messages: Array<{prompt: string, response: string, timestamp: string}>) => {
      const chatMessages: ChatMessage[] = [];
      messages.forEach(msg => {
        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'user',
          content: msg.prompt,
          timestamp: new Date(msg.timestamp)
        });

        let mode: ChatMessage['mode'] = 'default';
        try {
          const parsed = JSON.parse(msg.response);
          if (parsed && typeof parsed === 'object' && ('Files' in parsed || 'Conclusion' in parsed)) {
            mode = 'code';
          }
        } catch (e) { /* Not a JSON object, so default mode */ }

        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'ai',
          content: msg.response,
          timestamp: new Date(msg.timestamp),
          mode: mode
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

// Subscribe to isCodingMode to update chat mode
isCodingMode.subscribe(isCoding => {
  // This could be used to influence chat behavior, e.g., by setting a default mode
});