import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'VIEWER';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => {
            try {
                const res = await api.get('/auth/me');
                return res.data;
            } catch (e) {
                return null;
            }
        },
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: (creds: any) => api.post('/auth/login', creds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    const registerMutation = useMutation({
        mutationFn: (data: any) => api.post('/auth/register', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => api.post('/auth/logout'),
        onSuccess: () => {
            queryClient.setQueryData(['auth', 'me'], null);
        },
    });

    const value = {
        user: user || null,
        isLoading,
        login: async (creds: any) => {
            await loginMutation.mutateAsync(creds);
        },
        register: async (data: any) => {
            await registerMutation.mutateAsync(data);
        },
        logout: async () => {
            await logoutMutation.mutateAsync();
        },
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
