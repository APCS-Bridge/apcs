"use client";

import React from "react";
import { Search, Settings, Crown, Shield, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface HeaderProps {
  showSearch?: boolean;
}

const Header = ({ showSearch = false }: HeaderProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "Super Admin";
      case "ADMIN":
        return "Admin";
      default:
        return "User";
    }
  };

  return (
    <header className="h-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 flex items-center justify-between pl-72 pr-8">
      {/* Search Bar */}
      {showSearch && (
        <div className="relative w-96 hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search workspaces..."
            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
      )}

      {/* Right Actions - Settings, Profile */}
      <div className="flex items-center space-x-4 ml-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/settings')}
          className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
          aria-label="Settings"
        >
          <Settings size={20} />
        </motion.button>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2"></div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/settings')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
              {user?.name || "Guest"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {user ? getRoleLabel(user.role) : "Not logged in"}
            </p>
          </div>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden group-hover:border-indigo-400 transition-colors">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover absolute inset-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <span className={user?.avatarUrl ? 'hidden' : ''}>
              {user ? getInitials(user.name, user.email) : "G"}
            </span>
          </div>
        </motion.div>
      </div>
    </header>
  );
};

export default Header;
