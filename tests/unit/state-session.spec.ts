import { describe, it, expect, beforeEach } from 'vitest';
import { SessionState } from '@/state/session';

describe('SessionState', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts with a null user', () => {
        const s = new SessionState();
        expect(s.user).toBeNull();
    });

    it('language defaults to en when not stored', () => {
        const s = new SessionState();
        expect(s.language).toBe('en');
    });

    it('language getter/setter round-trips via localStorage', () => {
        const s = new SessionState();
        s.language = 'he';
        expect(localStorage.getItem('language')).toBe('he');
        expect(s.language).toBe('he');
    });

    it('token is undefined when not stored', () => {
        const s = new SessionState();
        expect(s.token).toBeUndefined();
    });

    it('token setter stores a value', () => {
        const s = new SessionState();
        s.token = 'abc123';
        expect(localStorage.getItem('token')).toBe('abc123');
        expect(s.token).toBe('abc123');
    });

    it('token setter with undefined removes the stored token', () => {
        const s = new SessionState();
        s.token = 'abc123';
        s.token = undefined;
        expect(localStorage.getItem('token')).toBeNull();
        expect(s.token).toBeUndefined();
    });

    it('token setter with empty string removes the stored token', () => {
        const s = new SessionState();
        s.token = 'abc';
        s.token = '';
        expect(s.token).toBeUndefined();
    });

    it('user can be assigned', () => {
        const s = new SessionState();
        s.user = { userId: 1, email: 'a@b.c', activated: true } as any;
        expect(s.user!.email).toBe('a@b.c');
    });
});
