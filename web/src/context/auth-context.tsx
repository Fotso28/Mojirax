'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { requestPushPermission, getDeviceInfo, onForegroundMessage } from '@/lib/fcm';

interface AuthContextType {
    user: User | null;
    dbUser: any | null; // Typed loosely for now, should be UserDTO
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshDbUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    dbUser: null,
    loading: true,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    logout: async () => { },
    refreshDbUser: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [dbUser, setDbUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // 0. Hydrate from LocalStorage (Instant Load)
        if (typeof window !== 'undefined') {
            const cachedDbUser = localStorage.getItem('db_user');

            if (cachedDbUser) setDbUser(JSON.parse(cachedDbUser));
            // We DO NOT hydrate 'user' here because it's a complex Firebase object with methods (getIdToken).
            // Restoring it from JSON makes it a plain object, causing "user.getIdToken is not a function" errors.
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Save basic info to cache
                const userCache = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL
                };
                localStorage.setItem('auth_user', JSON.stringify(userCache));
                setUser(currentUser);

                // 🚀 PERFORMANCE: Unblock UI immediately after Firebase check
                // Don't wait for backend sync to show the app shell
                setLoading(false);

                try {
                    // 1. Sync
                    await axiosInstance.post('/auth/sync');

                    // 2. Fetch Profile
                    const { data: profileData } = await axiosInstance.get('/users/profile');

                    if (profileData) {
                        setDbUser(profileData);
                        localStorage.setItem('db_user', JSON.stringify(profileData));
                    }

                    // 3. Register FCM push token (fire & forget)
                    registerFcmToken();
                } catch (err: any) {
                    // Background sync failed — silent unless 401
                    // If sync fails with 401, sign out to break the loop
                    if (err?.response?.status === 401) {
                        await signOut(auth);
                    }
                }
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_user');
                    localStorage.removeItem('db_user');
                }
                setDbUser(null);
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Register FCM token for push notifications
    const registerFcmToken = async () => {
        try {
            const token = await requestPushPermission();
            if (!token) return;

            const alreadySent = localStorage.getItem('fcm_token');
            if (alreadySent === token) return; // Déjà enregistré

            const { device, browser } = getDeviceInfo();
            await axiosInstance.post('/notifications/push/subscribe', { token, device, browser });
            localStorage.setItem('fcm_token', token);
        } catch {
            // Silently fail — push is optional
        }
    };

    // Listen for foreground FCM messages
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onForegroundMessage((payload) => {
            // Show browser notification even when app is focused
            if (Notification.permission === 'granted') {
                new Notification(payload.title, {
                    body: payload.body,
                    icon: '/icons/icon-192x192.png',
                });
            }
        });

        return unsubscribe;
    }, [user]);

    const signInWithGoogle = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            // Email sign-in failed
            setLoading(false);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            // Email sign-up failed
            setLoading(false);
            throw error;
        }
    };

    const refreshDbUser = async () => {
        try {
            const { data } = await axiosInstance.get('/users/profile');
            if (data) {
                setDbUser(data);
                localStorage.setItem('db_user', JSON.stringify(data));
            }
        } catch (error) {
            // Failed to refresh db user
        }
    };

    const logout = async () => {
        try {
            // Unregister FCM token before signing out
            const fcmToken = localStorage.getItem('fcm_token');
            if (fcmToken) {
                await axiosInstance.delete('/notifications/push/unsubscribe', { data: { token: fcmToken } }).catch(() => {});
                localStorage.removeItem('fcm_token');
            }

            await signOut(auth);
            router.push('/');
        } catch (error) {
            // Sign-out failed
        }
    };

    return (
        <AuthContext.Provider value={{ user, dbUser, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, refreshDbUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
