"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Minimize2,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  ChatMessage as ChatMessageType,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  createUserMessage,
  createAssistantMessage,
} from "@/lib/chat";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

interface ChatWidgetProps {
  workspaceId: string;
  userId: string;
  workspaceName: string;
  sessionId?: string;
  spaceId?: string;
  sprintId?: string | null;
}

// Always use orchestrator - it routes to the right specialist agent
const ORCHESTRATOR_AGENT_ID = "orchestrator" as const;

const ChatWidget: React.FC<ChatWidgetProps> = ({
  workspaceId,
  userId,
  workspaceName,
  sessionId,
  spaceId,
  sprintId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Log props on mount for debugging
  useEffect(() => {
    console.log("ChatWidget mounted with props:", {
      workspaceId,
      userId,
      workspaceName,
      sessionId,
      spaceId,
      sprintId,
    });
  }, [workspaceId, userId, workspaceName, sessionId, spaceId, sprintId]);

  // Load chat history on mount
  useEffect(() => {
    if (userId && workspaceId) {
      const history = loadChatHistory(userId, workspaceId);
      setMessages(history);
    }
  }, [userId, workspaceId]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (userId && workspaceId && messages.length > 0) {
      saveChatHistory(userId, workspaceId, messages);
    }
  }, [messages, userId, workspaceId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Debug logging
    console.log("ChatWidget - userId:", userId);
    console.log("ChatWidget - workspaceId:", workspaceId);
    console.log("ChatWidget - userId truthy?:", !!userId);
    console.log("ChatWidget - userId length:", userId?.length);

    if (!userId || userId === "" || !workspaceId || workspaceId === "") {
      setError(
        `Missing information - User: ${
          !userId || userId === "" ? "missing" : "ok"
        }, Workspace: ${
          !workspaceId || workspaceId === "" ? "missing" : "ok"
        }. Please refresh the page.`
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    // Add user message to UI
    const userMessage = createUserMessage(content);
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessageId = `assistant_${Date.now()}`;
    let assistantContent = "";

    try {
      // Use sessionId if available, otherwise create a temporary one
      const effectiveSessionId = sessionId || `temp_${userId}_${workspaceId}`;

      // Stream response from orchestrator (it routes to the right specialist)
      const stream = api.streamAgentMessage(
        ORCHESTRATOR_AGENT_ID,
        content,
        effectiveSessionId,
        {
          user_id: userId,
          space_id: spaceId || workspaceId,
          sprint_id: sprintId,
        }
      );

      // Process stream chunks
      for await (const chunk of stream) {
        assistantContent += chunk;

        // Update assistant message in real-time
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== assistantMessageId);
          const assistantMsg = createAssistantMessage(
            assistantContent,
            "orchestrator"
          );
          assistantMsg.id = assistantMessageId;
          return [...filtered, assistantMsg];
        });
      }

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);

      // Add error message to chat
      const errorMsg = createAssistantMessage(
        `❌ Error: ${errorMessage}. Please try again.`,
        "orchestrator"
      );
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== assistantMessageId);
        return [...filtered, errorMsg];
      });
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear all chat history for this workspace?")) {
      clearChatHistory(userId, workspaceId);
      setMessages([]);
      setError(null);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <>
      {/* Floating button (collapsed state) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
            aria-label="Open chat"
          >
            <MessageCircle size={24} />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {messages.length > 9 ? "9+" : messages.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window (expanded state) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 w-[400px] h-[600px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 bg-indigo-600 dark:bg-indigo-700 text-white px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} />
                  <h3 className="font-bold text-sm">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearChat}
                    className="p-1.5 hover:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat history"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors"
                    aria-label="Close chat"
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
              </div>

              {/* Workspace badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-indigo-500 dark:bg-indigo-800 px-2 py-1 rounded-full">
                  {workspaceName}
                </span>
              </div>

              {/* AI Assistant label */}
              <div className="relative">
                <div className="w-full bg-emerald-500/20 dark:bg-emerald-800/30 px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-300">🤖 AI Assistant</span>
                </div>
              </div>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shrink-0 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={16}
                      className="text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      aria-label="Dismiss error"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <div>
                    <MessageCircle
                      size={48}
                      className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3"
                    />
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Start a conversation
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Ask the AI Assistant anything
                      about your workspace
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <RefreshCw
                      size={14}
                      className="animate-spin text-zinc-600 dark:text-zinc-400"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 rounded-2xl">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                        <span
                          className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <span
                          className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder="Ask the AI Assistant..."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
