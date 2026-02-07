/**
 * Chat utility functions for managing chat history and localStorage
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agentType?: "workflow" | "scrum_master" | "administration" | "orchestrator";
}

export interface ChatSession {
  workspaceId: string;
  userId: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

/**
 * Generate storage key for chat history
 */
export function getChatStorageKey(userId: string, workspaceId: string): string {
  return `chat_history_${userId}_${workspaceId}`;
}

/**
 * Load chat history from localStorage
 */
export function loadChatHistory(
  userId: string,
  workspaceId: string
): ChatMessage[] {
  try {
    const key = getChatStorageKey(userId, workspaceId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const session: ChatSession = JSON.parse(stored);
    return session.messages || [];
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
}

/**
 * Save chat history to localStorage
 */
export function saveChatHistory(
  userId: string,
  workspaceId: string,
  messages: ChatMessage[]
): void {
  try {
    const key = getChatStorageKey(userId, workspaceId);
    const session: ChatSession = {
      workspaceId,
      userId,
      messages,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
}

/**
 * Clear chat history for a specific workspace
 */
export function clearChatHistory(userId: string, workspaceId: string): void {
  try {
    const key = getChatStorageKey(userId, workspaceId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear chat history:", error);
  }
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content: content.trim(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a new assistant message
 */
export function createAssistantMessage(
  content: string,
  agentType: "workflow" | "scrum_master" | "administration" | "orchestrator"
): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content: content.trim(),
    timestamp: new Date().toISOString(),
    agentType,
  };
}

/**
 * Format timestamp for display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get agent display name
 */
export function getAgentDisplayName(
  agentType: "workflow" | "scrum_master" | "administration" | "orchestrator"
): string {
  const names = {
    workflow: "Workflow Agent",
    scrum_master: "Scrum Master",
    administration: "Admin Agent",
    orchestrator: "AI Assistant",
  };
  return names[agentType];
}

/**
 * Get agent color theme
 */
export function getAgentColor(
  agentType: "workflow" | "scrum_master" | "administration" | "orchestrator"
): string {
  const colors = {
    workflow: "indigo",
    scrum_master: "blue",
    administration: "purple",
    orchestrator: "emerald",
  };
  return colors[agentType];
}

// ═══════════════════════════════════════════════════════════════
// Chat Room API Types & Functions
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface RoomUser {
  id: string;
  name: string;
  email: string;
}

export interface RoomMember {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: string;
  user: RoomUser;
}

export interface RoomMessage {
  id: string;
  content: string;
  roomId: string;
  senderId: string;
  createdAt: string;
  sender: RoomUser;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  members: RoomMember[];
  messages?: RoomMessage[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Get authorization headers with token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Get all chat rooms for the current user
 */
export async function getUserChatRooms(): Promise<ChatRoom[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chat rooms: ${response.statusText}`);
    }

    const result: ApiResponse<ChatRoom[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to fetch chat rooms");
    }

    return result.data;
  } catch (error) {
    console.error("Get user chat rooms error:", error);
    throw error;
  }
}

/**
 * Get a specific chat room by ID
 */
export async function getChatRoomById(roomId: string): Promise<ChatRoom> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chat room: ${response.statusText}`);
    }

    const result: ApiResponse<ChatRoom> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to fetch chat room");
    }

    return result.data;
  } catch (error) {
    console.error("Get chat room error:", error);
    throw error;
  }
}

/**
 * Get messages for a specific chat room
 */
export async function getChatRoomMessages(
  roomId: string,
  limit = 50,
  before?: string
): Promise<RoomMessage[]> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append("before", before);

    const response = await fetch(
      `${API_BASE_URL}/chat/rooms/${roomId}/messages?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    const result: ApiResponse<RoomMessage[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to fetch messages");
    }

    return result.data;
  } catch (error) {
    console.error("Get chat room messages error:", error);
    throw error;
  }
}

/**
 * Send a message in a chat room
 */
export async function sendChatMessage(
  roomId: string,
  content: string
): Promise<RoomMessage> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/chat/rooms/${roomId}/messages`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const result: ApiResponse<RoomMessage> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to send message");
    }

    return result.data;
  } catch (error) {
    console.error("Send message error:", error);
    throw error;
  }
}

/**
 * Create a new chat room
 */
export async function createChatRoom(
  userIds: string[],
  name?: string,
  isGroup = false
): Promise<ChatRoom> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ userIds, name, isGroup }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create chat room: ${response.statusText}`);
    }

    const result: ApiResponse<ChatRoom> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to create chat room");
    }

    return result.data;
  } catch (error) {
    console.error("Create chat room error:", error);
    throw error;
  }
}

/**
 * Leave a chat room
 */
export async function leaveChatRoom(roomId: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/chat/rooms/${roomId}/leave`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to leave chat room: ${response.statusText}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to leave chat room");
    }
  } catch (error) {
    console.error("Leave chat room error:", error);
    throw error;
  }
}
