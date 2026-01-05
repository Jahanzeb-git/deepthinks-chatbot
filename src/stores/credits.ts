import { writable, get } from 'svelte/store';
import { authStore } from './auth';

export interface CreditsInfo {
    total_credits_usd: number;
    used_credits_usd: number;
    remaining_credits_usd: number;
    credits_percentage_used: number;
}

export interface TokensInfo {
    total_allotted_tokens: number;
    used_tokens: number;
    remaining_tokens: number;
    tokens_percentage_used: number;
}

export interface BreakdownInfo {
    input_tokens_used: number;
    output_tokens_used: number;
    total_interactions: number;
}

export interface CreditsData {
    credits: CreditsInfo;
    tokens: TokensInfo;
    breakdown: BreakdownInfo;
}

export interface CreditsState {
    isCreditsModalOpen: boolean;
    isLoading: boolean;
    error: string | null;
    data: CreditsData | null;
}

const BASE_URL = 'https://chatbot-backend-wandering-shadow-534.fly.dev';

function createCreditsStore() {
    const { subscribe, set, update } = writable<CreditsState>({
        isCreditsModalOpen: false,
        isLoading: false,
        error: null,
        data: null,
    });

    async function fetchCredits() {
        // Get token and user from local storage
        const token = localStorage.getItem('deepthinks_token');
        const userStr = localStorage.getItem('deepthinks_user');

        if (!token || !userStr) {
            update(state => ({ ...state, error: 'Not authenticated', isLoading: false }));
            return;
        }

        let email: string;
        try {
            const user = JSON.parse(userStr);
            email = user.email;
        } catch {
            update(state => ({ ...state, error: 'Invalid user data', isLoading: false }));
            return;
        }

        update(state => ({ ...state, isLoading: true, error: null }));

        try {
            // Use both X-User-Email header and query param as requested/suggested, 
            // or just one. User provided multiple ways. I will use Authorization header 
            // (which contains the token, and presumably the backend can extract from it or I send the email header).
            // The user request says: "Can provide user email via: X-User-Email header, ?email=..., Authentication token"
            // I will send the token and the email query param to be safe and explicit.

            const params = new URLSearchParams({ email });

            const response = await fetch(`${BASE_URL}/api/credits?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email,
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch credits');
            }

            if (result.ok && result.data) {
                update(state => ({
                    ...state,
                    data: result.data,
                    isLoading: false,
                    error: null,
                }));
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error: any) {
            console.error('Failed to fetch credits:', error);
            update(state => ({
                ...state,
                error: error.message || 'Failed to fetch credits',
                isLoading: false,
            }));
        }
    }

    return {
        subscribe,
        openCreditsModal: () => {
            update(state => ({ ...state, isCreditsModalOpen: true }));
            fetchCredits();
        },
        closeCreditsModal: () => update(state => ({ ...state, isCreditsModalOpen: false })),
        refresh: fetchCredits,
        set
    };
}

export const creditsStore = createCreditsStore();
