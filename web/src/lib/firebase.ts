import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCkIeAQFjHrHCBViUDeRimnocUD-eiONnM",
    authDomain: "co-founder-babf6.firebaseapp.com",
    projectId: "co-founder-babf6",
    storageBucket: "co-founder-babf6.firebasestorage.app",
    messagingSenderId: "170097559363",
    appId: "1:170097559363:web:fd65308ef20251c48711f6"
};

// Initialize Firebase (Singleton pattern to avoid re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Auth and Providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
