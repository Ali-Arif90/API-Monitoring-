import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setToken } from '../lib/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user:  null,
            token: null,
            isAuthenticated: false,

            login: (user, token) => {
                setToken(token);
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                setToken(null);
                set({ user: null, token: null, isAuthenticated: false });
            },

            hydrate: () => {
                const { token } = get();
                if (token) setToken(token);
            },
        }),
        {
            name: 'api-monitor-auth',
            partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
        }
    )
);
