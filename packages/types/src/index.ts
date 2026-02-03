export interface UserDTO {
    id: string;
    email: string;
    role: 'FOUNDER' | 'CANDIDATE';
}

export const API_VERSION = 'v1';
