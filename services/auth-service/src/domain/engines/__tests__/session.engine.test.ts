import { SessionEngine } from '../session.engine';

describe('SessionEngine', () => {
    let engine: SessionEngine;

    beforeEach(() => {
        engine = new SessionEngine();
    });

    describe('createSession', () => {
        it('should create a valid session', async () => {
            const sessionId = await engine.createSession('user-1', 'buyer', 'chrome', '127.0.0.1');
            expect(sessionId).toBeDefined();

            const result = await engine.validateSession(sessionId);
            expect(result.valid).toBe(true);
            expect(result.session?.userId).toBe('user-1');
            expect(result.session?.role).toBe('buyer');
        });

        it('should set permissions based on role', async () => {
            const sessionId = await engine.createSession('user-1', 'admin', 'cli', '127.0.0.1');
            const result = await engine.validateSession(sessionId);
            expect(result.session?.permissions).toContain('*'); // Logic might be different, let's check code
        });
    });

    describe('validateSession', () => {
        it('should return invalid for unknown session', async () => {
            const result = await engine.validateSession('unknown');
            expect(result.valid).toBe(false);
        });

        it('should update last activity on validation', async () => {
            const sessionId = await engine.createSession('user-1', 'buyer', 'dev', 'ip');
            const initialSession = (await engine.validateSession(sessionId)).session!;
            const initialActivity = initialSession.lastActivity;

            // Wait a small bit? Js tests are fast.
            await new Promise(r => setTimeout(r, 10));

            const result = await engine.validateSession(sessionId);
            expect(result.session!.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
        });
    });

    describe('refreshSession', () => {
        it('should extend session expiration', async () => {
            const sessionId = await engine.createSession('user-1', 'buyer', 'dev', 'ip');
            const initialExp = (await engine.validateSession(sessionId)).session!.expiresAt;

            await engine.refreshSession(sessionId);

            const refreshedExp = (await engine.validateSession(sessionId)).session!.expiresAt;
            expect(refreshedExp.getTime()).toBeGreaterThan(initialExp.getTime());
        });
    });

    describe('terminateSession', () => {
        it('should remove session', async () => {
            const sessionId = await engine.createSession('user-1', 'buyer', 'dev', 'ip');
            await engine.terminateSession(sessionId);
            const result = await engine.validateSession(sessionId);
            expect(result.valid).toBe(false);
        });
    });

    describe('user session tracking', () => {
        it('should track multiple sessions for user', async () => {
            await engine.createSession('user-A', 'buyer', 'd1', 'ip');
            await engine.createSession('user-A', 'buyer', 'd2', 'ip');

            const count = await engine.getActiveSessionCount('user-A');
            expect(count).toBe(2);
        });

        it('should terminate all user sessions', async () => {
            await engine.createSession('user-B', 'buyer', 'd1', 'ip');
            await engine.createSession('user-B', 'buyer', 'd2', 'ip');

            await engine.terminateAllUserSessions('user-B');
            expect(await engine.getActiveSessionCount('user-B')).toBe(0);
        });
    });
});
