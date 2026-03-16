import Axios, { AxiosRequestConfig } from 'axios';
import { auth } from '@/lib/firebase';

export const AXIOS_INSTANCE = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
});

// Request interceptor — fresh token on every request
AXIOS_INSTANCE.interceptors.request.use(
    async (config) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // getIdToken() rafraîchit automatiquement si expiré
            const token = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
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
                alert('Votre compte a été désactivé, contactez le support');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                // Don't redirect if already on login or during auth sync (prevents loops)
                const isLoginPage = window.location.pathname === '/login';
                const isAuthSync = error.config?.url?.includes('/auth/sync');
                if (!isLoginPage && !isAuthSync) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('db_user');
                    window.location.href = '/login';
                }
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
