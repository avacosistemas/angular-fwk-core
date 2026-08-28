export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    permisos?: string[];
    passwordExpired?: boolean;
    username?: string;
    user?: string;
    guid?: string;
    [key: string]: any;
}
