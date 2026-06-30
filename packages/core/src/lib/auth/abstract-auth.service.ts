import { Observable } from 'rxjs';

export interface SignInData {
    username: string;
    password: string;
    [key: string]: any;
}

export abstract class AbstractAuthService {
    abstract readonly authenticated$: Observable<boolean>;

    abstract signIn(credentials: SignInData): Observable<any>;
    abstract signOut(): Observable<any>;
    abstract check(): Observable<boolean>;
    abstract refreshToken(): Observable<any>;
    abstract hasPermission(permission?: string): boolean;
    abstract getToken(): string | null;
}