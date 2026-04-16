import { logger } from '@/lib/logger';

export const getFirebaseErrorMessage = (error: any): string => {
    const code = error?.code || '';

    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return "Email ou mot de passe incorrect.";

        case 'auth/too-many-requests':
            return "Trop de tentatives échouées. Veuillez réessayer plus tard.";

        case 'auth/user-disabled':
            return "Ce compte a été désactivé.";

        case 'auth/email-already-in-use':
            return "Cette adresse email est déjà utilisée.";

        case 'auth/weak-password':
            return "Le mot de passe doit contenir au moins 6 caractères.";

        case 'auth/network-request-failed':
            return "Problème de connexion. Vérifiez votre réseau.";

        case 'auth/popup-closed-by-user':
            return "La connexion a été annulée.";

        default:
            logger.warn("Unhandled Firebase Error:", code);
            return "Une erreur est survenue lors de la connexion. Veuillez réessayer.";
    }
};
