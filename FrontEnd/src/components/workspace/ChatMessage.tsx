"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import {
  ChatMessage as ChatMessageType,
  formatMessageTime,
  getAgentDisplayName,
} from "@/lib/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : "text-left"}`}>
        {/* Agent name for assistant messages */}
        {!isUser && message.agentType && (
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            {getAgentDisplayName(message.agentType)}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`inline-block max-w-[85%] px-4 py-2.5 rounded-2xl ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap wrap-break-word">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-zinc-400 mt-1 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {formatMessageTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
