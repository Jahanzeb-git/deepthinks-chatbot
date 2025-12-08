import { writable, get } from 'svelte/store';

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

export interface EmailToolState {
    // Active state
    isActive: boolean;
    messageId: string | null;

    // Progress state
    currentIteration: number;
    reasoning: string;

    // Auth state
    needsAuth: boolean;
    authMessage: string | null;

    // Approval state
    needsApproval: boolean;
    approvalData: EmailApprovalData | null;

    // Completion state
    isCompleted: boolean;
    result: EmailToolResult | null;

    // Error state
    error: string | null;
}

const initialState: EmailToolState = {
    isActive: false,
    messageId: null,
    currentIteration: 0,
    reasoning: '',
    needsAuth: false,
    authMessage: null,
    needsApproval: false,
    approvalData: null,
    isCompleted: false,
    result: null,
    error: null,
};

function createEmailToolStore() {
    const { subscribe, set, update } = writable<EmailToolState>(initialState);

    return {
        subscribe,

        /**
         * Start a new email tool session
         */
        start: (messageId: string) => {
            set({
                ...initialState,
                isActive: true,
                messageId,
            });
        },

        /**
         * Set auth needed state
         */
        setNeedsAuth: (needsAuth: boolean, message: string | null) => {
            console.log('📦 STORE: setNeedsAuth invoked');
            console.log('📦 Parameters:', { needsAuth, message });
            update(state => {
                const newState = {
                    ...state,
                    needsAuth,
                    authMessage: message,
                    error: needsAuth ? null : state.error,
                };
                console.log('📦 Old state:', { needsAuth: state.needsAuth, isActive: state.isActive });
                console.log('📦 New state:', { needsAuth: newState.needsAuth, isActive: newState.isActive });
                return newState;
            });
        },

        /**
         * Set progress update
         */
        setProgress: (iteration: number, reasoning: string) => {
            update(state => ({
                ...state,
                currentIteration: iteration,
                reasoning,
                needsAuth: false, // Clear auth state on progress
            }));
        },

        /**
         * Set approval needed state
         */
        setNeedsApproval: (needsApproval: boolean, data: EmailApprovalData | null) => {
            update(state => ({
                ...state,
                needsApproval,
                approvalData: data,
            }));
        },

        /**
         * Set completed state
         */
        setCompleted: (result: EmailToolResult) => {
            update(state => ({
                ...state,
                isActive: false,
                isCompleted: true,
                result,
                needsAuth: false,
                needsApproval: false,
            }));
        },

        /**
         * Set error state
         */
        setError: (error: string) => {
            update(state => ({
                ...state,
                isActive: false,
                error,
                needsAuth: false,
                needsApproval: false,
            }));
        },

        /**
         * Reset to initial state
         */
        reset: () => {
            set(initialState);
        },

        /**
         * Get current state (for non-reactive access)
         */
        getState: () => get({ subscribe }),
    };
}

export const emailToolStore = createEmailToolStore();
