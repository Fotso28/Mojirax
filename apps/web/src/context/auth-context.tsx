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

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const token = await currentUser.getIdToken();
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', token);
                    }

                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                    console.log(`Syncing user with backend at ${apiUrl}/auth/sync...`);

                    // Sync with backend
                    const response = await fetch(`${apiUrl}/auth/sync`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error("Backend sync failed:", response.status, errorData);
                    } else {
                        console.log("User successfully synced with backend");
                    }
                } catch (error) {
                    console.error("Error syncing user with backend:", error);
                }
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                }
            }
            setUser(currentUser);
            setLoading(false);
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
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
