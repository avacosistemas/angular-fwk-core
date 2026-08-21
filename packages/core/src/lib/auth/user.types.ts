export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    foto?: any;
    status?: string;
    permisos?: string[];
    passwordExpired?: boolean;
    username?: string;
    user?: string;
    fechaVencimiento?: string;
    matricula?: any;
    idMatricula?: any;
    tipoMatricula?: any;
    imagen?: any;
    guid?: string;
    [key: string]: any;
}
