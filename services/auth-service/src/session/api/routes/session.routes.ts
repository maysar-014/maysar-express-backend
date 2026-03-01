import { Router } from 'express';
import { SessionEngine } from '../../../domain/engines/session.engine';

export function createSessionRouter(sessionEngine: SessionEngine): Router {
    const router = Router();

    // POST / - Create a new session
    router.post('/', async (req, res) => {
        try {
            const { userId, role, deviceInfo, ipAddress } = req.body;
            const sessionId = await sessionEngine.createSession(userId, role, deviceInfo, ipAddress);
            res.status(201).json({ sessionId });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to create session', message: error.message });
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
            const userId = req.query.userId as string;
            if (!userId) {
                return res.status(400).json({ error: 'userId is required' });
            }
            const sessions = await sessionEngine.getUserSessions(userId);
            res.json(sessions);
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch sessions', message: error.message });
        }
    });

    return router;
}
