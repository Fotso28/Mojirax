import Axios, { AxiosRequestConfig } from 'axios';

export const AXIOS_INSTANCE = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
});

// Request interceptor for adding auth token
AXIOS_INSTANCE.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
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
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
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
