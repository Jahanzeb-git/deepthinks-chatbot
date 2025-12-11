# WebSocket Events - Email Tool Integration Guide

This document describes all WebSocket events for the Email Tool feature, including event names, data formats, and usage examples.

## Connection Setup

### WebSocket URL
```
wss://your-backend-url.fly.dev/socket.io/
```

### Room Format
Each user session has a unique room:
```
email_tool_{user_id}_{session_id}
```

---

## Events FROM Frontend → Backend

### 1. `connect`
**When:** Initial WebSocket connection  
**Data:** None (automatic)  
**Response:** Backend sends `connected` event

---

### 2. `email_tool_join_room`
**When:** User starts an email tool session  
**Purpose:** Join the user's personal room to receive email tool events  

**Data Format:**
```typescript
{
  user_email: string,    // User's email address (e.g., "user@example.com")
  session_id: string     // Current chat session ID
}
```

**OR**

```typescript
{
  user_id: number,       // User's ID (if known)
  session_id: string     // Current chat session ID
}
```

**Example:**
```javascript
socket.emit('email_tool_join_room', {
  user_email: 'john@example.com',
  session_id: '12345'
});
```

**Response:** Backend sends `room_joined` or `error`

---

### 3. `email_tool_user_approved`
**When:** User approves or rejects a write operation (send email, create draft, etc.)  
**Purpose:** Provide user consent for potentially destructive operations  

**Data Format:**
```typescript
{
  user_id: number,       // User's ID
  session_id: string,    // Current session ID
  approved: boolean      // true = approved, false = rejected
}
```

**Example:**
```javascript
socket.emit('email_tool_user_approved', {
  user_id: 123,
  session_id: '12345',
  approved: true
});
```

**Response:** Backend sends `approval_received`

---

### 4. `email_tool_auth_completed`
**When:** User completes Gmail OAuth flow  
**Purpose:** Notify backend that authentication is complete  

**Data Format:**
```typescript
{
  user_id: number,       // User's ID
  session_id: string,    // Current session ID
  success: boolean       // true = auth successful, false = failed
}
```

**Example:**
```javascript
socket.emit('email_tool_auth_completed', {
  user_id: 123,
  session_id: '12345',
  success: true
});
```

**Response:** Backend sends `auth_completed_ack`

---

## Events FROM Backend → Frontend

### 1. `connected`
**When:** WebSocket connection established  
**Purpose:** Confirm connection is ready  

**Data Format:**
```typescript
{
  status: 'ok'
}
```

**Example:**
```javascript
socket.on('connected', (data) => {
  console.log('WebSocket connected:', data.status);
});
```

---

### 2. `room_joined`
**When:** Successfully joined email tool room  
**Purpose:** Confirm room join was successful  

**Data Format:**
```typescript
{
  room: string,          // Room name (e.g., "email_tool_123_12345")
  user_id: number,       // User's ID
  session_id: string     // Session ID
}
```

**Example:**
```javascript
socket.on('room_joined', (data) => {
  console.log('Joined room:', data.room);
});
```

---

### 3. `email_tool_needs_auth`
**When:** Gmail authentication is required  
**Purpose:** Prompt user to authenticate with Gmail  

**Data Format:**
```typescript
{
  message: string        // Human-readable message
}
```

**Example:**
```javascript
socket.on('email_tool_needs_auth', (data) => {
  // Show Gmail OAuth popup/redirect
  showGmailAuthPrompt(data.message);
});
```

**Frontend Action Required:**
1. Open Gmail OAuth URL: `GET /auth/gmail/authorize?session_id={session_id}`
2. After OAuth completes, send `email_tool_auth_completed` event

---

### 4. `email_tool_progress`
**When:** Agent completes each iteration  
**Purpose:** Show real-time progress to user  

**Data Format:**
```typescript
{
  iteration: number,     // Current iteration number (1, 2, 3, ...)
  reasoning: string      // What the agent is doing (shown to user)
}
```

**Example:**
```javascript
socket.on('email_tool_progress', (data) => {
  console.log(`Iteration ${data.iteration}: ${data.reasoning}`);
  // Update UI with progress message
  updateProgressUI(data.reasoning);
});
```

**Sample Messages:**
- `"This query is self-contained, no context needed."`
- `"Searching for emails from sarah@example.com..."`
- `"Found 3 emails! Reading the first one..."`
- `"Perfect! I have all the details. The email is about tomorrow's meeting at 2 PM."`

---

### 5. `email_tool_request_approval`
**When:** Agent wants to perform a write operation (send email, create draft, mark as read, etc.)  
**Purpose:** Request user permission before executing  

**Data Format:**
```typescript
{
  operation: string,     // Function name: "send_email", "create_draft", etc.
  parameters: object,    // Function parameters
  reasoning: string      // Why the agent wants to do this
}
```

**Example:**
```javascript
socket.on('email_tool_request_approval', (data) => {
  // Show approval dialog to user
  const message = `${data.reasoning}\n\nOperation: ${data.operation}\nParameters: ${JSON.stringify(data.parameters, null, 2)}`;
  
  const approved = confirm(message + '\n\nApprove this action?');
  
  // Send approval response
  socket.emit('email_tool_user_approved', {
    user_id: currentUserId,
    session_id: currentSessionId,
    approved: approved
  });
});
```

**Sample Payload:**
```json
{
  "operation": "send_email",
  "parameters": {
    "to": "john@example.com",
    "subject": "Meeting Follow-up",
    "body": "Hi John, following up on our meeting..."
  },
  "reasoning": "Sending the follow-up email to John as you requested..."
}
```

---

### 6. `email_tool_completed`
**When:** Agent successfully completes the task  
**Purpose:** Provide final results to display to user  

**Data Format:**
```typescript
{
  result: {
    success: boolean,
    summary: string,              // Final answer/summary for user
    total_iterations: number,     // How many iterations it took
    iterations: Array<{           // Detailed history
      iteration: number,
      reasoning: string,
      function: string | null,
      parameters: object | null,
      result: object
    }>,
    final_reasoning: string       // Same as summary
  }
}
```

**Example:**
```javascript
socket.on('email_tool_completed', (data) => {
  console.log('Email tool completed!');
  console.log('Summary:', data.result.summary);
  
  // Display result to user
  displayEmailToolResult(data.result.summary);
  
  // Optionally show iteration details
  console.log('Iterations:', data.result.iterations);
});
```

**Sample Payload:**
```json
{
  "result": {
    "success": true,
    "summary": "Yes, the email from Affan Siddiqui is present in your inbox. I found multiple emails from this address, including one dated April 24, 2025.",
    "total_iterations": 3,
    "iterations": [
      {
        "iteration": 2,
        "reasoning": "Searching for emails from affansiddiqui2021@gmail.com...",
        "function": "search_emails",
        "parameters": {
          "from_addr": "affansiddiqui2021@gmail.com",
          "is_unread": false
        },
        "result": {
          "success": true,
          "result": [
            {
              "id": "1966815b008f5caa",
              "subject": "",
              "from": "Affan Siddiqui <affansiddiqui2021@gmail.com>",
              "to": "",
              "date": "Thu, 24 Apr 2025 18:56:14 +0500",
              "snippet": "F73/5 FC area karachi..."
            }
          ]
        }
      }
    ],
    "final_reasoning": "Yes, the email from Affan Siddiqui is present..."
  }
}
```

---

### 7. `email_tool_error`
**When:** An error occurs during execution  
**Purpose:** Notify user of failure  

**Data Format:**
```typescript
{
  error: string          // Error message
}
```

**Example:**
```javascript
socket.on('email_tool_error', (data) => {
  console.error('Email tool error:', data.error);
  showErrorMessage(data.error);
});
```

**Sample Errors:**
- `"Gmail authentication timed out. Please try again."`
- `"Failed to search emails: Invalid query"`
- `"Max iterations reached"`

---

### 8. `approval_received`
**When:** Backend acknowledges user approval  
**Purpose:** Confirm approval was received  

**Data Format:**
```typescript
{
  approved: boolean      // What user chose
}
```

**OR (if error):**

```typescript
{
  error: string          // Error message
}
```

**Example:**
```javascript
socket.on('approval_received', (data) => {
  if (data.error) {
    console.error('Approval error:', data.error);
  } else {
    console.log('Approval received:', data.approved);
  }
});
```

---

### 9. `auth_completed_ack`
**When:** Backend acknowledges auth completion  
**Purpose:** Confirm auth status was received  

**Data Format:**
```typescript
{
  status: 'ready' | 'failed'
}
```

**OR (if error):**

```typescript
{
  error: string          // Error message
}
```

**Example:**
```javascript
socket.on('auth_completed_ack', (data) => {
  if (data.error) {
    console.error('Auth ack error:', data.error);
  } else {
    console.log('Auth status:', data.status);
  }
});
```

---

### 10. `error`
**When:** Generic error (room join failure, etc.)  
**Purpose:** Handle connection/setup errors  

**Data Format:**
```typescript
{
  message: string        // Error message
}
```

**Example:**
```javascript
socket.on('error', (data) => {
  console.error('WebSocket error:', data.message);
});
```

---

## Complete Integration Example

```javascript
import io from 'socket.io-client';

// Connect to WebSocket
const socket = io('wss://your-backend.fly.dev', {
  transports: ['websocket'],
  reconnection: true
});

// Connection events
socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('connected', (data) => {
  console.log('Server confirmed connection:', data);
  
  // Join email tool room
  socket.emit('email_tool_join_room', {
    user_email: currentUserEmail,
    session_id: currentSessionId
  });
});

socket.on('room_joined', (data) => {
  console.log('Joined room:', data.room);
});

// Email tool events
socket.on('email_tool_needs_auth', (data) => {
  // Open Gmail OAuth
  window.open(`/auth/gmail/authorize?session_id=${currentSessionId}`, '_blank');
});

socket.on('email_tool_progress', (data) => {
  // Show progress to user
  updateProgressUI(`Step ${data.iteration}: ${data.reasoning}`);
});

socket.on('email_tool_request_approval', (data) => {
  // Show approval dialog
  const approved = confirm(
    `${data.reasoning}\n\n` +
    `Operation: ${data.operation}\n` +
    `Approve?`
  );
  
  socket.emit('email_tool_user_approved', {
    user_id: currentUserId,
    session_id: currentSessionId,
    approved: approved
  });
});

socket.on('email_tool_completed', (data) => {
  // Show final result
  displayResult(data.result.summary);
  console.log('Full details:', data.result);
});

socket.on('email_tool_error', (data) => {
  // Show error
  showError(data.error);
});

// Error handling
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});
```

---

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND                          BACKEND                  │
├─────────────────────────────────────────────────────────────┤
│  connect ─────────────────────────►                         │
│  ◄───────────────────────── connected {status: 'ok'}        │
│                                                              │
│  email_tool_join_room ─────────────►                        │
│  ◄───────────────────────── room_joined                     │
│                                                              │
│  (HTTP: Start email tool via /chat)                         │
│                                                              │
│  ◄───────────────────────── email_tool_progress (iter 1)    │
│  ◄───────────────────────── email_tool_progress (iter 2)    │
│                                                              │
│  ◄───────────────────────── email_tool_request_approval     │
│  email_tool_user_approved ─────────►                        │
│  ◄───────────────────────── approval_received               │
│                                                              │
│  ◄───────────────────────── email_tool_progress (iter 3)    │
│  ◄───────────────────────── email_tool_completed            │
└─────────────────────────────────────────────────────────────┘
```

---

## Notes

1. **Room Join is Required:** Always join the room before the email tool starts, otherwise you won't receive events.

2. **Session ID:** Must match the session ID used in the HTTP `/chat` request that triggers the email tool.

3. **User Approval:** Write operations (send_email, create_draft, mark_as_read, mark_as_unread) require user approval.

4. **Auth Flow:** If `email_tool_needs_auth` is received, open the OAuth URL and then send `email_tool_auth_completed` after the user completes authentication.

5. **Error Handling:** Always listen for both `email_tool_error` and generic `error` events.

6. **Reconnection:** Implement reconnection logic in case of network issues.
