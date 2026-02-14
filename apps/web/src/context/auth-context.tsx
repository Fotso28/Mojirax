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

interface AuthContextType {
    user: User | null;
    dbUser: any | null; // Typed loosely for now, should be UserDTO
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    dbUser: null,
    loading: true,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    logout: async () => { },
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
                    const token = await currentUser.getIdToken();
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', token);
                    }

                    try {
                        // 1. Sync
                        await axiosInstance.post('/auth/sync');

                        // 2. Fetch Profile
                        const { data: profileData } = await axiosInstance.get('/users/profile');

                        if (profileData) {
                            setDbUser(profileData);
                            localStorage.setItem('db_user', JSON.stringify(profileData)); // Cache it!
                        }
                    } catch (err) {
                        console.error("Background sync failed", err);
                    }
                } catch (error) {
                    console.error("Error processing auth user:", error);
                }
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
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

    const signInWithGoogle = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            setLoading(false);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing in with email", error);
            setLoading(false);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing up with email", error);
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
            }
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, dbUser, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
