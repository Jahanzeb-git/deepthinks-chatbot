import { writable } from 'svelte/store';

// Centralized configuration - edit these values to tune behavior
export const CONTAINER_CONFIG = {
    INACTIVITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes in milliseconds
    BOOT_DURATION: 6000, // 6 seconds for boot countdown
    LOADING_TEXT_INTERVAL: 2500, // Change loading text every 2.5 seconds
};

// Store to track the last chat request timestamp
const lastChatRequestTime = writable<number | null>(null);

/**
 * Check if we should show the boot UI based on inactivity time
 * @returns true if 5+ minutes have passed since last chat request
 */
export function shouldShowBootUI(): boolean {
    let lastTime: number | null = null;
    lastChatRequestTime.subscribe(value => lastTime = value)();

    // First request ever
    if (lastTime === null) {
        return false;
    }

    const timeSinceLastRequest = Date.now() - lastTime;
    return timeSinceLastRequest >= CONTAINER_CONFIG.INACTIVITY_TIMEOUT;
}

/**
 * Update the timestamp of the last chat request
 */
export function updateLastChatRequestTime(): void {
    lastChatRequestTime.set(Date.now());
}

/**
 * Reset the timer (useful for testing or initial load)
 */
export function resetTimer(): void {
    lastChatRequestTime.set(null);
}
