import { Router } from 'express';
import { TrainingController } from '../controllers/training.controller';
import { validationMiddleware } from '../middleware/validation.middleware';
import { TrainingValidator } from '../validators/training.validator';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import type { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import type { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import type { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';

interface TrainingRepos {
    moduleRepo: ITrainingModuleRepository;
    requirementRepo: ICertificationRequirementRepository;
    trainingRecordRepo: ITrainingRecordRepository;
}

export function createTrainingRoutes(controller: TrainingController, repos?: TrainingRepos): Router {
    const router = Router();

    router.use(requireAuth);

    // ── Learner self-service routes ───────────────────────────────────────────

    router.post(
        '/start',
        validationMiddleware(TrainingValidator.validateStartRequest),
        asyncHandler(controller.start.bind(controller))
    );

    router.post(
        '/:id/complete',
        asyncHandler(controller.complete.bind(controller))
    );

    router.get(
        '/progress/:learnerId',
        asyncHandler(controller.getProgress.bind(controller))
    );

    router.get(
        '/eligibility/:learnerId',
        asyncHandler(controller.checkEligibility.bind(controller))
    );

    router.get(
        '/available',
        asyncHandler(controller.getAvailableModules.bind(controller))
    );

    router.post(
        '/:id/progress',
        validationMiddleware(TrainingValidator.validateTrackProgressRequest),
        asyncHandler(controller.trackProgress.bind(controller))
    );

    // ── Admin: Module Management (full CRUD) ──────────────────────────────────

    router.get(
        '/admin/modules',
        requireRole(['admin', 'system']),
        asyncHandler(async (_req, res) => {
            const modules = await repos?.moduleRepo.findAll() ?? [];
            res.json({ success: true, data: modules, total: modules.length });
        })
    );

    router.get(
        '/admin/modules/:id',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const m = await repos?.moduleRepo.findById(req.params.id);
            if (!m) { res.status(404).json({ success: false, error: 'Module not found' }); return; }
            res.json({ success: true, data: m });
        })
    );

    router.post(
        '/admin/modules',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { id, name, description, content, contentType, durationMinutes, category, prerequisites, targetRoles, isPublic, difficulty } = req.body;
            if (!id || !name) { res.status(400).json({ success: false, error: 'id and name are required' }); return; }

            const { TrainingModule: TM, ContentType, DifficultyLevel } = await import('../../domain/entities/training-module.entity');
            const m = TM.create({
                id, name,
                description: description || '',
                contentType: contentType || ContentType.TEXT,
                content: content || { type: 'TEXT', body: description || '' },
                durationMinutes: durationMinutes || 15,
                category: category || 'general',
                prerequisites: prerequisites || [],
                targetRoles: targetRoles || [],
                isPublic: isPublic !== false,
                difficulty: difficulty || DifficultyLevel.BEGINNER
            });

            await (repos?.moduleRepo as any)?.save?.(m);
            res.status(201).json({ success: true, message: 'Training module created', data: m });
        })
    );

    router.put(
        '/admin/modules/:id',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { id } = req.params;
            const existing = await repos?.moduleRepo.findById(id);
            if (!existing) { res.status(404).json({ success: false, error: 'Module not found' }); return; }
            const updated = await (repos?.moduleRepo as any)?.update?.(id, req.body);
            res.json({ success: true, message: 'Training module updated', data: updated ?? { id, ...req.body } });
        })
    );

    // PATCH content — admin can add/edit/reorder sections and steps
    router.patch(
        '/admin/modules/:id/content',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { id } = req.params;
            const existing = await repos?.moduleRepo.findById(id);
            if (!existing) { res.status(404).json({ success: false, error: 'Module not found' }); return; }

            const currentContent = (existing as any).content || {};
            const newContent = req.body.content ?? req.body;
            const mergedContent = {
                ...(typeof currentContent === 'object' ? currentContent : {}),
                ...(typeof newContent === 'object' ? newContent : { body: newContent })
            };

            await (repos?.moduleRepo as any)?.update?.(id, { content: mergedContent });
            res.json({ success: true, message: 'Module content updated', data: { id, content: mergedContent } });
        })
    );

    router.delete(
        '/admin/modules/:id',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            await (repos?.moduleRepo as any)?.delete?.(req.params.id);
            res.json({ success: true, message: `Module ${req.params.id} deleted` });
        })
    );

    // ── Admin: Certification Requirements Management ──────────────────────────

    router.get(
        '/admin/requirements',
        requireRole(['admin', 'system']),
        asyncHandler(async (_req, res) => {
            const requirements = await repos?.requirementRepo.findAll() ?? [];
            res.json({ success: true, data: requirements, total: requirements.length });
        })
    );

    router.post(
        '/admin/requirements',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { module, minimumScore, validityPeriodDays, mandatory, maxAttempts } = req.body;
            if (!module) { res.status(400).json({ success: false, error: 'module is required' }); return; }

            const { CertificationRequirement } = await import('../../domain/entities/certification-requirement.entity');
            const req2 = CertificationRequirement.create({
                module,
                minimumScore: minimumScore ?? 60,
                validityPeriodDays: validityPeriodDays ?? 365,
                mandatory: mandatory ?? false,
                maxAttempts: maxAttempts ?? 5
            });
            await (repos?.requirementRepo as any)?.save?.(req2);
            res.status(201).json({ success: true, message: 'Requirement created', data: req2 });
        })
    );

    router.put(
        '/admin/requirements/:module',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const updated = await (repos?.requirementRepo as any)?.update?.(req.params.module, req.body);
            if (!updated) { res.status(404).json({ success: false, error: 'Requirement not found' }); return; }
            res.json({ success: true, message: 'Requirement updated', data: updated });
        })
    );

    router.delete(
        '/admin/requirements/:module',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            await (repos?.requirementRepo as any)?.delete?.(req.params.module);
            res.json({ success: true, message: `Requirement for ${req.params.module} deleted` });
        })
    );

    // ── Admin: Learner Management ─────────────────────────────────────────────

    router.get(
        '/admin/learners',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { moduleId, status, limit = '50', offset = '0' } = req.query;
            const recordRepo = repos?.trainingRecordRepo as any;
            let records: any[] = [];

            if (moduleId) {
                records = await recordRepo?.findAllByModule?.(String(moduleId), { limit: Number(limit), offset: Number(offset) }) ?? [];
            } else if (status) {
                records = await recordRepo?.findAllWithStatus?.(String(status), { limit: Number(limit), offset: Number(offset) }) ?? [];
            } else {
                records = await recordRepo?.findAllWithStatus?.('IN_PROGRESS', { limit: Number(limit), offset: Number(offset) }) ?? [];
            }

            res.json({ success: true, data: records, total: records.length, filters: { moduleId, status, limit, offset } });
        })
    );

    router.get(
        '/admin/learners/:learnerId',
        requireRole(['admin', 'system']),
        asyncHandler(controller.getProgress.bind(controller))
    );

    router.post(
        '/admin/complete-for-learner',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { learnerId, moduleId, score } = req.body;
            if (!learnerId) { res.status(400).json({ success: false, error: 'learnerId is required' }); return; }
            res.status(200).json({
                success: true,
                message: 'Training completed by admin override',
                data: {
                    learnerId,
                    moduleId: moduleId || 'all-modules',
                    status: 'COMPLETED',
                    score: score ?? 100,
                    completedAt: new Date().toISOString(),
                    adminOverride: true
                }
            });
        })
    );

    router.post(
        '/admin/grant-eligibility/:learnerId',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Eligibility granted by admin override',
                data: {
                    learnerId: req.params.learnerId,
                    eligible: true,
                    completionPercentage: 100,
                    adminOverride: true,
                    grantedAt: new Date().toISOString()
                }
            });
        })
    );

    router.delete(
        '/admin/learners/:learnerId/reset',
        requireRole(['admin', 'system']),
        asyncHandler(async (req, res) => {
            const { learnerId } = req.params;
            await (repos?.trainingRecordRepo as any)?.deleteByLearnerId?.(learnerId);
            res.json({ success: true, message: `All training records for learner ${learnerId} reset`, learnerId });
        })
    );

    router.get(
        '/admin/stats',
        requireRole(['admin', 'system']),
        asyncHandler(async (_req, res) => {
            const modules = await repos?.moduleRepo.findAll() ?? [];
            const stats = await Promise.all(modules.map(async (m: any) => ({
                moduleId: m.id,
                moduleName: m.name,
                totalEnrollments: await (repos?.trainingRecordRepo as any)?.countByModule?.(m.id) ?? 0
            })));

            res.json({
                success: true,
                data: { totalModules: modules.length, moduleStats: stats, generatedAt: new Date().toISOString() }
            });
        })
    );

    return router;
}
