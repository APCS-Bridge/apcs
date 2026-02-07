"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  Search,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserChatRooms,
  getChatRoomMessages,
  sendChatMessage,
  createChatRoom,
  ChatRoom,
  RoomMessage,
} from "@/lib/chat";
import { api } from "@/lib/api";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const ChatRoomPage = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create room modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [roomName, setRoomName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Not authenticated - redirect to login
        router.push("/login");
        return;
      }
      // All authenticated users can access chat rooms (SUPERADMIN, ADMIN, USER)
      fetchRooms();
      fetchAvailableUsers();
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    setError("");
    try {
      const fetchedRooms = await getUserChatRooms();
      setRooms(fetchedRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat rooms");
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.getUsers();
      if (response.success && response.data) {
        const users = response.data
          .filter((u: any) => u.id !== user?.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }));
        setAvailableUsers(users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const fetchedMessages = await getChatRoomMessages(roomId);
      setMessages(fetchedMessages.reverse());
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const sentMessage = await sendChatMessage(selectedRoom.id, messageContent);
      setMessages((prev) => [...prev, sentMessage]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.name) return room.name;
    if (!room.isGroup && room.members) {
      const otherMember = room.members.find((m) => m.userId !== user?.id);
      return otherMember?.user.name || "Unknown User";
    }
    return "Chat Room";
  };

  const getLastMessage = (room: ChatRoom) => {
    if (room.messages && room.messages.length > 0) {
      const lastMsg = room.messages[0];
      return lastMsg.content.length > 40
        ? lastMsg.content.substring(0, 40) + "..."
        : lastMsg.content;
    }
    return "No messages yet";
  };

  const formatMessageTime = (timestamp: string) => {
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
  };

  const filteredRooms = rooms.filter((room) =>
    getRoomDisplayName(room).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRoom = async () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user");
      return;
    }

    if (isGroup && !roomName.trim()) {
      alert("Please enter a group name");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const newRoom = await createChatRoom(
        selectedUsers,
        isGroup ? roomName : undefined,
        isGroup
      );
      setRooms((prev) => [newRoom, ...prev]);
      setSelectedRoom(newRoom);
      setIsCreateModalOpen(false);
      resetCreateModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const resetCreateModal = () => {
    setSelectedUsers([]);
    setRoomName("");
    setIsGroup(false);
    setUserSearchQuery("");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Determine which sidebar to use based on user role
  const SidebarComponent = user?.role === "SUPERADMIN" ? Sidebar : AdminSidebar;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex transition-colors duration-300">
      <SidebarComponent />

      <main className="flex-1 ml-64 min-w-0">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                    <MessageSquare className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                      Chat Rooms
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Connect and communicate with your team
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsCreateModalOpen(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-md hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={20} />
                  <span>New Chat</span>
                </motion.button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Chat Interface */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-[calc(100vh-16rem)]">
              <div className="flex h-full">
                {/* Rooms List Sidebar */}
                <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
                  {/* Search */}
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Rooms List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoadingRooms ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                      </div>
                    ) : filteredRooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageSquare className="text-zinc-300 dark:text-zinc-700 mb-3" size={48} />
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                          {searchQuery ? "No rooms found" : "No chat rooms yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredRooms.map((room) => (
                          <motion.button
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                            className={`w-full p-4 text-left transition-colors ${
                              selectedRoom?.id === room.id
                                ? "bg-indigo-50 dark:bg-indigo-900/20"
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                {room.isGroup ? (
                                  <Users className="text-white" size={18} />
                                ) : (
                                  <MessageSquare className="text-white" size={18} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {getRoomDisplayName(room)}
                                  </h3>
                                  {room.messages && room.messages.length > 0 && (
                                    <span className="text-xs text-zinc-400 ml-2">
                                      {formatMessageTime(room.messages[0].createdAt)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                  {getLastMessage(room)}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                  {selectedRoom ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                            {selectedRoom.isGroup ? (
                              <Users className="text-white" size={18} />
                            ) : (
                              <MessageSquare className="text-white" size={18} />
                            )}
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                              {getRoomDisplayName(selectedRoom)}
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {selectedRoom.members.length} member
                              {selectedRoom.members.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageSquare className="text-zinc-300 dark:text-zinc-700 mb-3" size={48} />
                            <p className="text-zinc-500 dark:text-zinc-400">
                              No messages yet. Start the conversation!
                            </p>
                          </div>
                        ) : (
                          messages.map((message) => {
                            const isOwnMessage = message.senderId === user?.id;
                            return (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${
                                  isOwnMessage ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[70%] ${
                                    isOwnMessage
                                      ? "bg-indigo-600 text-white"
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  } rounded-2xl px-4 py-2`}
                                >
                                  {!isOwnMessage && (
                                    <p className="text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                                      {message.sender.name}
                                    </p>
                                  )}
                                  <p className="text-sm break-words">{message.content}</p>
                                  <p
                                    className={`text-xs mt-1 ${
                                      isOwnMessage
                                        ? "text-indigo-200"
                                        : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                                  >
                                    {formatMessageTime(message.createdAt)}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <form
                        onSubmit={handleSendMessage}
                        className="p-4 border-t border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage(e);
                                }
                              }}
                              placeholder="Type a message..."
                              rows={1}
                              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                          <motion.button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isSending ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Send size={18} />
                            )}
                          </motion.button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <MessageSquare className="text-zinc-300 dark:text-zinc-700 mb-4" size={64} />
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        Select a chat room
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
                        Choose a chat room from the list to start messaging
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setIsCreateModalOpen(false);
              resetCreateModal();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[80vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Create New Chat
                </h2>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateModal();
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                {/* Chat Type Toggle */}
                <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setIsGroup(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      !isGroup
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Direct Chat
                  </button>
                  <button
                    onClick={() => setIsGroup(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      isGroup
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Group Chat
                  </button>
                </div>

                {/* Group Name Input */}
                {isGroup && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter group name"
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* User Search */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Select {isGroup ? "Members" : "User"}
                  </label>
                  <div className="relative mb-2">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Selected Users Count */}
                  {selectedUsers.length > 0 && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2">
                      {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
                    </p>
                  )}

                  {/* Users List */}
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        No users found
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            if (!isGroup && selectedUsers.length === 1 && !selectedUsers.includes(u.id)) {
                              setSelectedUsers([u.id]);
                            } else {
                              toggleUserSelection(u.id);
                            }
                          }}
                          className={`w-full p-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                            selectedUsers.includes(u.id)
                              ? "bg-indigo-50 dark:bg-indigo-900/20"
                              : ""
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {u.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {u.email}
                            </p>
                          </div>
                          {selectedUsers.includes(u.id) && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateModal();
                  }}
                  className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={selectedUsers.length === 0 || isCreatingRoom || (isGroup && !roomName.trim())}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingRoom ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    "Create Chat"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatRoomPage;
