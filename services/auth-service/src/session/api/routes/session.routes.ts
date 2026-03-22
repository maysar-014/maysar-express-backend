import { Router } from 'express';
import { SessionEngine } from '../../../domain/engines/session.engine';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

export function createSessionRouter(sessionEngine: SessionEngine): Router {
    const router = Router();

    // All session operations require authentication
    router.use(requireAuth);

    // POST / - Create a new session
    router.post('/', async (req, res) => {
        try {
            const authUser = (req as any).user;
            const userId = req.body?.userId || authUser?.userId;
            const role = req.body?.role || authUser?.roles?.[0] || 'user';
            const { deviceInfo, ipAddress } = req.body || {};

            if (!userId) {
                res.status(400).json({ success: false, message: 'userId is required' });
                return;
            }

            const sessionId = await sessionEngine.createSession(userId, role, deviceInfo, ipAddress);
            res.status(201).json({
                success: true,
                message: 'Session created',
                data: { sessionId }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to create session',
                error: error.message
            });
        }
    });


    // DELETE /:sessionId - Invalidate a session
    router.delete('/:sessionId', async (req, res) => {
        try {
            await sessionEngine.terminateSession(req.params.sessionId);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to invalidate session', message: error.message });
        }
    });

    // GET / - List active sessions for the current user
    router.get('/', async (req, res) => {
        try {
            const authUser = (req as any).user;
            const userId = (req.query.userId as string) || authUser?.userId;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'userId is required' });
            }
            const sessions = await sessionEngine.getUserSessions(userId);
            res.status(200).json({
                success: true,
                data: sessions
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sessions',
                error: error.message
            });
        }
    });

    return router;
}
