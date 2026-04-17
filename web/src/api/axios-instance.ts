import Axios, { AxiosRequestConfig } from 'axios';
import { auth } from '@/lib/firebase';

export const AXIOS_INSTANCE = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
});

// Localized fallback messages used outside React (axios interceptor).
// Must stay in sync with common/dashboard namespaces.
const BANNED_MESSAGE: Record<string, string> = {
    fr: 'Votre compte a été désactivé, contactez le support',
    en: 'Your account has been disabled, please contact support',
    es: 'Su cuenta ha sido desactivada, contacte con soporte',
    pt: 'Sua conta foi desativada, entre em contato com o suporte',
    ar: 'تم تعطيل حسابك، يرجى التواصل مع الدعم',
};

const SESSION_EXPIRED_MESSAGE: Record<string, string> = {
    fr: 'Session expirée, reconnexion…',
    en: 'Session expired, reconnecting…',
    es: 'Sesión expirada, reconectando…',
    pt: 'Sessão expirada, reconectando…',
    ar: 'انتهت الجلسة، جارٍ إعادة الاتصال…',
};

function currentLocale(): string {
    if (typeof window === 'undefined') return 'fr';
    return localStorage.getItem('mojirax-lang') || 'fr';
}

// Request interceptor — fresh token + Accept-Language on every request
AXIOS_INSTANCE.interceptors.request.use(
    async (config) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // getIdToken() rafraîchit automatiquement si expiré
            const token = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Envoyer la locale pour l'i18n backend
        if (typeof window !== 'undefined') {
            const lang = localStorage.getItem('mojirax-lang') || 'fr';
            config.headers['Accept-Language'] = lang;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
AXIOS_INSTANCE.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Check for PLAN_REQUIRED (FREE user tries to use paid feature)
        if (
            error.response?.status === 403 &&
            error.response?.data?.code === 'PLAN_REQUIRED'
        ) {
            if (typeof window !== 'undefined') {
                const url: string = error.config?.url || '';
                let feature: 'apply' | 'create_project' | 'send_message' | 'generic' = 'generic';
                if (url.includes('/applications')) feature = 'apply';
                else if (url.includes('/projects')) feature = 'create_project';
                else if (url.includes('/messages/conversations')) feature = 'send_message';
                window.dispatchEvent(
                    new CustomEvent('upsell:required', { detail: { feature } }),
                );
            }
            return Promise.reject(error);
        }

        // Check for banned account
        if (
            error.response?.status === 403 &&
            error.response?.data?.code === 'ACCOUNT_BANNED'
        ) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('db_user');
                const { auth } = await import('@/lib/firebase');
                const { signOut } = await import('firebase/auth');
                await signOut(auth).catch(() => {});
                const locale = currentLocale();
                window.dispatchEvent(
                    new CustomEvent('app:toast', {
                        detail: {
                            message: BANNED_MESSAGE[locale] ?? BANNED_MESSAGE.fr,
                            type: 'error',
                        },
                    }),
                );
                setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && typeof window !== 'undefined') {
            const config = error.config as AxiosRequestConfig & { _retry?: boolean };
            const isLoginPage = window.location.pathname === '/login';
            const isAuthSync = config?.url?.includes('/auth/sync');

            // Silent refresh: on first 401, force-refresh the Firebase token
            // and retry the original request once. Only if that fails do we
            // log the user out.
            if (!isLoginPage && !isAuthSync && !config?._retry) {
                try {
                    const currentUser = auth.currentUser;
                    if (currentUser) {
                        const freshToken = await currentUser.getIdToken(true);
                        config._retry = true;
                        config.headers = {
                            ...(config.headers || {}),
                            Authorization: `Bearer ${freshToken}`,
                        };
                        return AXIOS_INSTANCE.request(config);
                    }
                } catch {
                    // fall through to logout
                }
            }

            if (!isLoginPage && !isAuthSync) {
                localStorage.removeItem('token');
                localStorage.removeItem('db_user');
                const locale = currentLocale();
                window.dispatchEvent(
                    new CustomEvent('app:toast', {
                        detail: {
                            message: SESSION_EXPIRED_MESSAGE[locale] ?? SESSION_EXPIRED_MESSAGE.fr,
                            type: 'warning',
                        },
                    }),
                );
                setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
        }
        return Promise.reject(error);
    }
);

export const customAxios = <T>(config: AxiosRequestConfig): Promise<T> => {
    const source = Axios.CancelToken.source();
    const promise = AXIOS_INSTANCE({
        ...config,
        cancelToken: source.token
    }).then(({ data }) => data);

    // @ts-ignore
    promise.cancel = () => {
        source.cancel('Query was cancelled');
    };

    return promise;
};

export default customAxios;
