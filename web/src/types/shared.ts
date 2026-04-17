export interface UserDTO {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
}

export const API_VERSION = 'v1';
