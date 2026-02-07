'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User } from '@/lib/api';

// SuperAdmin credentials - always logged in
const SUPERADMIN_CREDENTIALS = {
    email: 'apcsSuperAdmin@gmail.com',
    password: 'superAdmin123'
};

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setUser(null);
                return false;
            }

            const response = await api.getCurrentUser();
            if (response.success && response.data) {
                setUser(response.data);
                return true;
            } else {
                setUser(null);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                return false;
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
            setUser(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            return false;
        }
    }, []);

    // Auto-login SuperAdmin on app start
    const autoLoginSuperAdmin = useCallback(async () => {
        try {
            const response = await api.login(SUPERADMIN_CREDENTIALS.email, SUPERADMIN_CREDENTIALS.password);
            if (response.success && response.data) {
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                setUser(response.data.user);
                return true;
            }
        } catch (error) {
            console.error('SuperAdmin auto-login failed:', error);
        }
        return false;
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);
            
            // Try to refresh existing session
            await refreshUser();
            
            setIsLoading(false);
        };

        initAuth();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const response = await api.login(email, password);
        
        if (response.success && response.data) {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            setUser(response.data.user);
        } else {
            throw new Error(response.message || 'Login failed');
        }
    };

    const logout = async () => {
        try {
            // Call backend logout first (while token is still available)
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local state and tokens, even if API call fails
            setUser(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                isSuperAdmin: user?.role === 'SUPERADMIN',
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
