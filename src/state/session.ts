import { UserDTO } from '@/dtos/user';

export class SessionState {
    public user: UserDTO | undefined;

    public get language(): string {
        return localStorage.getItem('language') || 'en';
    }

    public set language(lang: string) {
        localStorage.setItem('language', lang);
    }

    public get token(): string | undefined {
        return localStorage.getItem('token') || undefined;
    }

    public set token(token: string | undefined) {
        if (!token) {
            localStorage.removeItem('token');
        } else {
            localStorage.setItem('token', token);
        }
    }
}
