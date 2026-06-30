export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    permisos?: string[];
    refreshToken?: string;
    passwordExpired?: boolean;
    username?: string;
    fechaVencimiento?: string;
}
