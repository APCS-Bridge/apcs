"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // All users go to login
        router.push('/login');
      } else {
        // Not authenticated - redirect to login
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, isSuperAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
}
