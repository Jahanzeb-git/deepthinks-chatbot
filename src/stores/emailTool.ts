import { writable, get } from 'svelte/store';

// ============================================================================
// Type Definitions
// ============================================================================

export interface EmailApprovalData {
    operation: string;
    parameters: {
        to: string[];
        subject: string;
        body: string;
        cc: string[];
        bcc: string[];
    };
    reasoning: string;
}

export interface EmailToolResult {
    success: boolean;
    summary?: string;
    total_iterations?: number;
    message?: string;
    cancelled?: boolean;
}

/**
 * Represents a single iteration/step in the email tool execution
 */
export interface IterationStep {
    iteration: number;
    reasoning: string;
    isTyping: boolean;
    isComplete: boolean;
    approval?: EmailApprovalData; // Approval tied to this specific step
}

/**
 * State for a single email tool instance
 * Each email_tool call in a message gets its own isolated state
 */
export interface EmailToolState {
    // Identity
    messageId: string;

    // Active state
    isActive: boolean;

    // Progress state - now tracks all iterations
    currentIteration: number;
    iterations: IterationStep[];

    // Auth state
    needsAuth: boolean;
    authMessage: string | null;

    // Approval state (also tracked in iterations for UI placement)
    needsApproval: boolean;
    approvalData: EmailApprovalData | null;

    // Completion state
    isCompleted: boolean;
    result: EmailToolResult | null;

    // Error state
    error: string | null;
}

/**
 * Map of all email tool states, keyed by messageId
 * This allows multiple email tools in a session to maintain independent state
 */
export interface EmailToolStatesMap {
    [messageId: string]: EmailToolState;
}

/**
 * Buffered event types for handling timing issues
 */
type BufferedEvent =
    | { type: 'needs_auth'; needsAuth: boolean; message: string | null }
    | { type: 'progress'; iteration: number; reasoning: string }
    | { type: 'needs_approval'; needsApproval: boolean; data: EmailApprovalData | null }
    | { type: 'completed'; result: EmailToolResult }
    | { type: 'error'; error: string };

// ============================================================================
// Initial State Factory
// ============================================================================

const createInitialState = (messageId: string): EmailToolState => ({
    messageId,
    isActive: true,
    currentIteration: 0,
    iterations: [],
    needsAuth: false,
    authMessage: null,
    needsApproval: false,
    approvalData: null,
    isCompleted: false,
    result: null,
    error: null,
});

// ============================================================================
// Store Creation
// ============================================================================

function createEmailToolStore() {
    const { subscribe, set, update } = writable<EmailToolStatesMap>({});

    // Track which email tool is currently active (receiving events)
    let activeEmailToolId: string | null = null;

    // Buffer events that arrive before start() is called
    // This handles the race condition where backend sends events before frontend parses tool_call
    let eventBuffer: BufferedEvent[] = [];
    let bufferTimeout: ReturnType<typeof setTimeout> | null = null;

    // Clear buffer after 5 seconds (events without a start() are stale)
    const BUFFER_TIMEOUT_MS = 5000;

    function clearBuffer() {
        eventBuffer = [];
        if (bufferTimeout) {
            clearTimeout(bufferTimeout);
            bufferTimeout = null;
        }
    }

    function addToBuffer(event: BufferedEvent) {
        console.log('📧 Buffering event (no active email tool):', event.type);
        eventBuffer.push(event);

        // Set/reset timeout to clear stale buffer
        if (bufferTimeout) {
            clearTimeout(bufferTimeout);
        }
        bufferTimeout = setTimeout(() => {
            console.log('📧 Buffer timeout - clearing stale events');
            clearBuffer();
        }, BUFFER_TIMEOUT_MS);
    }

    function replayBuffer(messageId: string, store: ReturnType<typeof createEmailToolStore>) {
        if (eventBuffer.length === 0) return;

        console.log('📧 Replaying', eventBuffer.length, 'buffered events for', messageId);

        const eventsToReplay = [...eventBuffer];
        clearBuffer();

        // Replay each event with the now-active messageId
        eventsToReplay.forEach(event => {
            switch (event.type) {
                case 'needs_auth':
                    store.setNeedsAuth(event.needsAuth, event.message);
                    break;
                case 'progress':
                    store.setProgress(event.iteration, event.reasoning);
                    break;
                case 'needs_approval':
                    store.setNeedsApproval(event.needsApproval, event.data);
                    break;
                case 'completed':
                    store.setCompleted(event.result);
                    break;
                case 'error':
                    store.setError(event.error);
                    break;
            }
        });
    }

    const store = {
        subscribe,

        /**
         * Get the currently active email tool ID
         */
        getActiveId: (): string | null => {
            return activeEmailToolId;
        },

        /**
         * Set the active email tool ID (for routing events)
         */
        setActiveId: (messageId: string | null) => {
            activeEmailToolId = messageId;
            console.log('📧 Active email tool ID set to:', messageId);
        },

        /**
         * Start a new email tool session for a specific message
         */
        start: (messageId: string) => {
            console.log('📧 Starting email tool for message:', messageId);
            activeEmailToolId = messageId;

            update(states => ({
                ...states,
                [messageId]: createInitialState(messageId),
            }));

            // Replay any buffered events that arrived before start() was called
            // Use setTimeout to ensure store update is processed first
            setTimeout(() => {
                replayBuffer(messageId, store);
            }, 0);
        },

        /**
         * Get state for a specific message (non-reactive)
         */
        getState: (messageId: string): EmailToolState | null => {
            const states = get({ subscribe });
            return states[messageId] || null;
        },

        /**
         * Set auth needed state for the active email tool
         */
        setNeedsAuth: (needsAuth: boolean, message: string | null) => {
            const messageId = activeEmailToolId;
            if (!messageId) {
                // Buffer the event for later replay
                addToBuffer({ type: 'needs_auth', needsAuth, message });
                return;
            }

            console.log('📧 setNeedsAuth for', messageId, ':', { needsAuth, message });

            update(states => {
                const state = states[messageId];
                if (!state) {
                    console.warn('📧 No state found for messageId:', messageId);
                    return states;
                }

                return {
                    ...states,
                    [messageId]: {
                        ...state,
                        needsAuth,
                        authMessage: message,
                        error: needsAuth ? null : state.error,
                    },
                };
            });
        },

        /**
         * Set progress update - adds or updates an iteration step
         */
        setProgress: (iteration: number, reasoning: string) => {
            const messageId = activeEmailToolId;
            if (!messageId) {
                // Buffer the event for later replay
                addToBuffer({ type: 'progress', iteration, reasoning });
                return;
            }

            console.log('📧 setProgress for', messageId, ':', { iteration, reasoning: reasoning.substring(0, 50) + '...' });

            update(states => {
                const state = states[messageId];
                if (!state) {
                    console.warn('📧 No state found for messageId:', messageId);
                    return states;
                }

                // Check if this iteration already exists
                const existingIndex = state.iterations.findIndex(i => i.iteration === iteration);

                let newIterations: IterationStep[];

                if (existingIndex >= 0) {
                    // Update existing iteration (e.g., reasoning updated)
                    newIterations = state.iterations.map((step, idx) => {
                        if (idx === existingIndex) {
                            return { ...step, reasoning, isTyping: true };
                        }
                        return step;
                    });
                } else {
                    // Mark all previous iterations as complete (not typing)
                    newIterations = state.iterations.map(step => ({
                        ...step,
                        isTyping: false,
                        isComplete: true,
                    }));

                    // Add new iteration
                    newIterations.push({
                        iteration,
                        reasoning,
                        isTyping: true,
                        isComplete: false,
                    });
                }

                return {
                    ...states,
                    [messageId]: {
                        ...state,
                        currentIteration: iteration,
                        iterations: newIterations,
                        needsAuth: false, // Clear auth state on progress
                    },
                };
            });
        },

        /**
         * Set approval needed state - ties approval to current step
         */
        setNeedsApproval: (needsApproval: boolean, data: EmailApprovalData | null) => {
            const messageId = activeEmailToolId;
            if (!messageId) {
                // Buffer the event for later replay
                addToBuffer({ type: 'needs_approval', needsApproval, data });
                return;
            }

            console.log('📧 setNeedsApproval for', messageId, ':', { needsApproval, operation: data?.operation });

            update(states => {
                const state = states[messageId];
                if (!state) {
                    console.warn('📧 No state found for messageId:', messageId);
                    return states;
                }

                let newIterations = [...state.iterations];

                // If approval is needed and we have iterations, attach to current step
                if (needsApproval && data && newIterations.length > 0) {
                    const lastIndex = newIterations.length - 1;
                    newIterations[lastIndex] = {
                        ...newIterations[lastIndex],
                        approval: data,
                        isTyping: false, // Stop typing when showing approval
                    };
                }

                // If approval is no longer needed (user responded), clear from step
                if (!needsApproval && newIterations.length > 0) {
                    newIterations = newIterations.map(step => {
                        if (step.approval) {
                            const { approval, ...rest } = step;
                            return rest as IterationStep;
                        }
                        return step;
                    });
                }

                return {
                    ...states,
                    [messageId]: {
                        ...state,
                        needsApproval,
                        approvalData: data,
                        iterations: newIterations,
                    },
                };
            });
        },

        /**
         * Set completed state
         */
        setCompleted: (result: EmailToolResult) => {
            const messageId = activeEmailToolId;
            if (!messageId) {
                // Buffer the event for later replay
                addToBuffer({ type: 'completed', result });
                return;
            }

            console.log('📧 setCompleted for', messageId, ':', result);

            update(states => {
                const state = states[messageId];
                if (!state) {
                    console.warn('📧 No state found for messageId:', messageId);
                    return states;
                }

                // Mark all iterations as complete
                const newIterations = state.iterations.map(step => ({
                    ...step,
                    isTyping: false,
                    isComplete: true,
                }));

                return {
                    ...states,
                    [messageId]: {
                        ...state,
                        isActive: false,
                        isCompleted: true,
                        result,
                        needsAuth: false,
                        needsApproval: false,
                        approvalData: null,
                        iterations: newIterations,
                    },
                };
            });

            // Clear active ID after completion
            activeEmailToolId = null;
        },

        /**
         * Set error state
         */
        setError: (error: string) => {
            const messageId = activeEmailToolId;
            if (!messageId) {
                // Buffer the event for later replay
                addToBuffer({ type: 'error', error });
                return;
            }

            console.log('📧 setError for', messageId, ':', error);

            update(states => {
                const state = states[messageId];
                if (!state) {
                    console.warn('📧 No state found for messageId:', messageId);
                    return states;
                }

                return {
                    ...states,
                    [messageId]: {
                        ...state,
                        isActive: false,
                        error,
                        needsAuth: false,
                        needsApproval: false,
                    },
                };
            });

            // Clear active ID after error
            activeEmailToolId = null;
        },

        /**
         * Reset state for a specific message
         */
        reset: (messageId: string) => {
            update(states => {
                const newStates = { ...states };
                delete newStates[messageId];
                return newStates;
            });

            if (activeEmailToolId === messageId) {
                activeEmailToolId = null;
            }
        },

        /**
         * Clear all states (e.g., on session change)
         */
        clearAll: () => {
            set({});
            activeEmailToolId = null;
            clearBuffer();
        },
    };

    return store;
}

export const emailToolStore = createEmailToolStore();
