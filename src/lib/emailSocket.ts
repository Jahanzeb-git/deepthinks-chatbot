import { io, Socket } from 'socket.io-client';
import { emailToolStore } from '../stores/emailTool';

const BASE_URL = 'https://chatbot-backend-wandering-shadow-534.fly.dev';

let socket: Socket | null = null;
let currentRoom: string | null = null;

/**
 * Get JWT token from localStorage
 */
function getToken(): string | null {
  return localStorage.getItem('deepthinks_token');
}

/**
 * Get active session ID from localStorage
 * deepthinks_sessions is an array where index 0 is the active session
 */
function getActiveSessionId(): string | null {
  const sessionsStr = localStorage.getItem('deepthinks_sessions');
  if (!sessionsStr) return null;
  
  try {
    const sessions = JSON.parse(sessionsStr);
    if (Array.isArray(sessions) && sessions.length > 0) {
      return sessions[0].toString();
    }
  } catch (e) {
    console.error('Failed to parse sessions from localStorage:', e);
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
    return user.id || null;
  } catch (e) {
    console.error('Failed to parse user from localStorage:', e);
  }
  return null;
}

/**
 * Initialize Socket.IO connection for email tool
 * Should be called when user is authenticated
 */
export function connectEmailSocket(): void {
  if (socket?.connected) {
    console.log('Email socket already connected');
    return;
  }

  const token = getToken();
  if (!token) {
    console.warn('Cannot connect email socket: No auth token');
    return;
  }

  socket = io(BASE_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Email socket connected');
    // Join room on connect
    joinEmailRoom();
  });

  socket.on('disconnect', (reason) => {
    console.log('Email socket disconnected:', reason);
    currentRoom = null;
  });

  socket.on('connect_error', (error) => {
    console.error('Email socket connection error:', error);
  });

  // Room joined confirmation
  socket.on('room_joined', (data: { room: string }) => {
    console.log('Joined email room:', data.room);
    currentRoom = data.room;
  });

  // Gmail authentication needed
  socket.on('email_tool_needs_auth', (data: { message: string }) => {
    console.log('Email tool needs auth:', data.message);
    emailToolStore.setNeedsAuth(true, data.message);
  });

  // Progress updates
  socket.on('email_tool_progress', (data: { iteration: number; reasoning: string }) => {
    console.log('Email tool progress:', data);
    emailToolStore.setProgress(data.iteration, data.reasoning);
  });

  // Approval request
  socket.on('email_tool_request_approval', (data: {
    operation: string;
    parameters: { to: string[]; subject: string; body: string; cc: string[]; bcc: string[] };
    reasoning: string;
  }) => {
    console.log('Email tool requesting approval:', data);
    emailToolStore.setNeedsApproval(true, data);
  });

  // Approval acknowledged
  socket.on('approval_received', (data: { approved: boolean }) => {
    console.log('Approval received:', data);
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
    console.log('Email tool completed:', data);
    emailToolStore.setCompleted(data.result);
  });

  // Error
  socket.on('email_tool_error', (data: { error: string }) => {
    console.error('Email tool error:', data.error);
    emailToolStore.setError(data.error);
  });
}

/**
 * Join email tool room
 * Must be connected first
 */
export function joinEmailRoom(): void {
  if (!socket?.connected) {
    console.warn('Cannot join room: Socket not connected');
    return;
  }

  const userId = getUserId();
  const sessionId = getActiveSessionId();

  if (!userId || !sessionId) {
    console.warn('Cannot join room: Missing userId or sessionId');
    return;
  }

  socket.emit('email_tool_join_room', {
    user_id: userId,
    session_id: sessionId
  });
}

/**
 * Send approval response to backend
 */
export function sendApprovalResponse(approved: boolean): void {
  if (!socket?.connected) {
    console.error('Cannot send approval: Socket not connected');
    return;
  }

  const userId = getUserId();
  const sessionId = getActiveSessionId();

  if (!userId || !sessionId) {
    console.error('Cannot send approval: Missing userId or sessionId');
    return;
  }

  socket.emit('email_tool_user_approved', {
    user_id: userId,
    session_id: sessionId,
    approved
  });
}

/**
 * Disconnect socket
 */
export function disconnectEmailSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentRoom = null;
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
  const sessionId = getActiveSessionId();
  return `${BASE_URL}/auth/gmail/authorize?session_id=${sessionId}`;
}
