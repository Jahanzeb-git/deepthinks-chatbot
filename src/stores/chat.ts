import { writable } from 'svelte/store';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isInitialState: boolean;
  isLoading: boolean;
  currentStreamingId: string | null;
}

const initialState: ChatState = {
  messages: [],
  isInitialState: true,
  isLoading: false,
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
    startAIResponse: () => {
      const messageId = crypto.randomUUID();
      update(state => ({
        ...state,
        messages: [...state.messages, {
          id: messageId,
          type: 'ai',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }],
        isLoading: false,
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
    finishStreaming: (messageId: string) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, isStreaming: false }
            : msg
        ),
        currentStreamingId: null
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
    clearMessages: () => {
      update(state => ({
        ...state,
        messages: [],
        isInitialState: true,
        isLoading: false,
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
        chatMessages.push({
          id: crypto.randomUUID(),
          type: 'ai',
          content: msg.response,
          timestamp: new Date(msg.timestamp)
        });
      });
      
      update(state => ({
        ...state,
        messages: chatMessages,
        isInitialState: chatMessages.length === 0,
        isLoading: false,
        currentStreamingId: null
      }));
    }
  };
}

export const chatStore = createChatStore();