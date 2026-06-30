import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from './user.types';
import { map, Observable, ReplaySubject, tap } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class UserService {
    constructor(private _httpClient: HttpClient) {}
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    private _currentUserLocal: User | null = null;

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User) {
        this._currentUserLocal = value;
        this._user.next(value);
    }

    get user$(): Observable<User> {
        return this._user.asObservable();
    }

    get userValue(): User | null {
        return this._currentUserLocal;
    }

    get(): Observable<User> {
        return this._httpClient.get<User>('api/common/user').pipe(
            tap((user) => {
                this._user.next(user);
            }),
        );
    }

    /**
     * @param user
     */
    update(user: User): Observable<any> {
        return this._httpClient.patch<User>('api/common/user', { user }).pipe(
            map((response) => {
                this._user.next(response);
            }),
        );
    }
}