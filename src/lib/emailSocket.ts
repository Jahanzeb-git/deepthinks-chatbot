import { io, Socket } from 'socket.io-client';
import { emailToolStore } from '../stores/emailTool';

const BASE_URL = 'https://chatbot-backend-wandering-shadow-534.fly.dev';

// ============================================================================
// Module-level State
// ============================================================================

let socket: Socket | null = null;
let currentJoinedRoom: string | null = null;
let currentSessionId: string | null = null;
let currentUserId: number | null = null; // Stored from room_joined response
let pendingSessionId: string | null = null;
let isConnecting: boolean = false;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get JWT token from localStorage
 */
function getToken(): string | null {
    return localStorage.getItem('deepthinks_token');
}

/**
 * Get user email from localStorage
 */
function getUserEmail(): string | null {
    const userStr = localStorage.getItem('deepthinks_user');
    if (!userStr) return null;

    try {
        const user = JSON.parse(userStr);
        return user.email || null;
    } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
    }
    return null;
}

/**
 * Get user ID from localStorage
 */
function getUserId(): number | null {
    const userStr = localStorage.getItem('deepthinks_user');
    if (!userStr) return null;

    try {
        const user = JSON.parse(userStr);
        return user.id || user.user_id || null;
    } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
    }
    return null;
}

// ============================================================================
// Socket Event Handlers
// ============================================================================

/**
 * Set up all socket event handlers
 */
function setupEventHandlers(): void {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
        console.log('📧 Email socket connected, id:', socket?.id);
        isConnecting = false;

        // Priority: pending session first, then current session for rejoining
        const sessionToJoin = pendingSessionId || currentSessionId;
        if (sessionToJoin) {
            console.log('📧 Rejoining room for session:', sessionToJoin);
            joinRoomInternal(sessionToJoin);
            pendingSessionId = null; // Clear pending after join attempt
        } else {
            console.log('📧 No session to join on connect');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('📧 Email socket disconnected:', reason);
        // Don't clear currentSessionId - we need it for rejoining
        // Only clear the joined room marker
        currentJoinedRoom = null;
    });

    socket.on('connect_error', (error) => {
        console.error('📧 Email socket connection error:', error);
        isConnecting = false;
    });

    // Reconnection handling
    socket.on('reconnect', (attemptNumber) => {
        console.log('📧 Email socket reconnected after', attemptNumber, 'attempts');
        // Re-join room after reconnection
        if (currentSessionId) {
            joinRoomInternal(currentSessionId);
        }
    });

    // Room joined confirmation - extract and store user_id for later use
    socket.on('room_joined', (data: { room: string; user_id?: number; session_id?: string }) => {
        console.log('📧 Joined email room:', data.room, 'user_id:', data.user_id);
        currentJoinedRoom = data.room;
        if (data.user_id) {
            currentUserId = data.user_id;
        }
    });

    // ========================================================================
    // Email Tool Events - Route to active email tool instance
    // ========================================================================

    // Gmail authentication needed
    socket.on('email_tool_needs_auth', (data: { message: string }) => {
        console.log('🔔 EVENT: email_tool_needs_auth');
        console.log('📨 Data:', data);
        console.log('📧 Active email tool:', emailToolStore.getActiveId());
        emailToolStore.setNeedsAuth(true, data.message);
    });

    // Progress updates
    socket.on('email_tool_progress', (data: { iteration: number; reasoning: string }) => {
        console.log('🔔 EVENT: email_tool_progress');
        console.log('📨 Data:', { iteration: data.iteration, reasoning: data.reasoning.substring(0, 50) + '...' });
        console.log('📧 Active email tool:', emailToolStore.getActiveId());
        emailToolStore.setProgress(data.iteration, data.reasoning);
    });

    // Approval request
    socket.on('email_tool_request_approval', (data: {
        operation: string;
        parameters: { to: string[]; subject: string; body: string; cc: string[]; bcc: string[] };
        reasoning: string;
    }) => {
        console.log('🔔 EVENT: email_tool_request_approval');
        console.log('📨 Data:', { operation: data.operation, to: data.parameters.to });
        console.log('📧 Active email tool:', emailToolStore.getActiveId());
        emailToolStore.setNeedsApproval(true, data);
    });

    // Approval acknowledged
    socket.on('approval_received', (data: { approved: boolean }) => {
        console.log('🔔 EVENT: approval_received');
        console.log('📨 Data:', data);
        emailToolStore.setNeedsApproval(false, null);
    });

    // Task completed
    socket.on('email_tool_completed', (data: {
        result: {
            success: boolean;
            summary?: string;
            total_iterations?: number;
            message?: string;
            cancelled?: boolean;
        };
    }) => {
        console.log('🔔 EVENT: email_tool_completed');
        console.log('📨 Data:', data.result);
        console.log('📧 Active email tool:', emailToolStore.getActiveId());
        emailToolStore.setCompleted(data.result);
    });

    // Error
    socket.on('email_tool_error', (data: { error: string }) => {
        console.error('🔔 EVENT: email_tool_error');
        console.error('📨 Data:', data.error);
        console.log('📧 Active email tool:', emailToolStore.getActiveId());
        emailToolStore.setError(data.error);
    });

    // Generic error
    socket.on('error', (data: { message: string }) => {
        console.error('📧 Socket error:', data.message);
    });
}

// ============================================================================
// Internal Room Management
// ============================================================================

/**
 * Internal function to join a room
 */
function joinRoomInternal(sessionId: string): void {
    if (!socket?.connected) {
        console.warn('📧 Cannot join room: Socket not connected');
        pendingSessionId = sessionId;
        return;
    }

    const userEmail = getUserEmail();
    if (!userEmail) {
        console.warn('📧 Cannot join room: No user email');
        return;
    }

    const expectedRoom = `email_tool_${userEmail}_${sessionId}`;

    // Don't rejoin if already in the correct room
    if (currentJoinedRoom === expectedRoom) {
        console.log('📧 Already in room:', expectedRoom);
        return;
    }

    console.log('📧 Joining room:', { user_email: userEmail, session_id: sessionId });
    currentSessionId = sessionId;

    socket.emit('email_tool_join_room', {
        user_email: userEmail,
        session_id: sessionId
    });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize Socket.IO connection for email tool
 * Should be called when user is authenticated
 * NOTE: Does NOT join any room - use joinEmailRoomForSession for that
 */
export function connectEmailSocket(): void {
    if (socket?.connected) {
        console.log('📧 Email socket already connected');
        return;
    }

    if (isConnecting) {
        console.log('📧 Email socket connection already in progress');
        return;
    }

    const token = getToken();
    if (!token) {
        console.warn('📧 Cannot connect email socket: No auth token');
        return;
    }

    isConnecting = true;
    console.log('📧 Connecting email socket...');

    socket = io(BASE_URL, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    setupEventHandlers();
}

/**
 * Join email tool room for a specific session
 * This should be called whenever the active session changes
 * 
 * @param sessionId - The session ID/number to join room for
 */
export function joinEmailRoomForSession(sessionId: string): void {
    console.log('📧 joinEmailRoomForSession called with:', sessionId);

    if (!sessionId) {
        console.warn('📧 Cannot join room: No session ID provided');
        return;
    }

    // Store the session ID for potential reconnect
    currentSessionId = sessionId;

    if (!socket) {
        // Socket not created yet, store as pending
        console.log('📧 Socket not created, storing pending session:', sessionId);
        pendingSessionId = sessionId;
        return;
    }

    if (!socket.connected) {
        // Socket exists but not connected, store as pending
        console.log('📧 Socket not connected, storing pending session:', sessionId);
        pendingSessionId = sessionId;
        return;
    }

    // Socket is connected, join immediately
    joinRoomInternal(sessionId);
}

/**
 * Send approval response to backend
 */
export function sendApprovalResponse(approved: boolean): void {
    if (!socket?.connected) {
        console.error('📧 Cannot send approval: Socket not connected');
        return;
    }

    // Use user_id from room_joined event
    if (!currentUserId || !currentSessionId) {
        console.error('📧 Cannot send approval: Missing userId or sessionId', { userId: currentUserId, sessionId: currentSessionId });
        return;
    }

    console.log('📧 Sending approval response:', { user_id: currentUserId, session_id: currentSessionId, approved });

    socket.emit('email_tool_user_approved', {
        user_id: currentUserId,
        session_id: currentSessionId,
        approved
    });
}

/**
 * Notify backend that auth was completed
 */
export function sendAuthCompleted(success: boolean): void {
    if (!socket?.connected) {
        console.error('📧 Cannot send auth completed: Socket not connected');
        return;
    }

    const userEmail = getUserEmail();
    if (!userEmail || !currentSessionId) {
        console.error('📧 Cannot send auth completed: Missing userEmail or sessionId');
        return;
    }

    console.log('📧 Sending auth completed:', { success, session_id: currentSessionId });

    socket.emit('email_tool_auth_completed', {
        user_email: userEmail,
        session_id: currentSessionId,
        success
    });
}

/**
 * Disconnect socket
 */
export function disconnectEmailSocket(): void {
    if (socket) {
        console.log('📧 Disconnecting email socket');
        socket.disconnect();
        socket = null;
        currentJoinedRoom = null;
        currentSessionId = null;
        pendingSessionId = null;
        isConnecting = false;
    }
}

/**
 * Check if socket is connected
 */
export function isEmailSocketConnected(): boolean {
    return socket?.connected ?? false;
}

/**
 * Get the Gmail OAuth URL
 */
export function getGmailOAuthUrl(): string {
    const token = localStorage.getItem('deepthinks_token');
    return `${BASE_URL}/auth/gmail/authorize?session_id=${currentSessionId}&token=${token}`;
}

/**
 * Get current session ID (for debugging)
 */
export function getCurrentSessionId(): string | null {
    return currentSessionId;
}

/**
 * Get current joined room (for debugging)
 */
export function getCurrentJoinedRoom(): string | null {
    return currentJoinedRoom;
}
