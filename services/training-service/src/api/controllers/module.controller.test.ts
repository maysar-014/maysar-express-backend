import { ModuleController } from './module.controller';
import { ContentType, DifficultyLevel, TrainingModule } from '../../domain/entities/training-module.entity';

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ModuleController', () => {
  it('lists modules and maps them to dto response', async () => {
    const module = TrainingModule.create({
      id: 'module-1',
      name: 'Safety',
      description: 'Basics',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'x' },
      durationMinutes: 20,
      category: 'core',
      prerequisites: [],
      targetRoles: [],
      isPublic: true,
      difficulty: DifficultyLevel.BEGINNER
    });
    const moduleRepo = { findAll: jest.fn().mockResolvedValue([module]) };
    const controller = new ModuleController(
      moduleRepo as never,
      {} as never,
      {} as never
    );
    const res = createRes();
    const next = jest.fn();

    await controller.list({} as never, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({ id: 'module-1', name: 'Safety' })]
    });
  });

  it('forwards not found error in get()', async () => {
    const moduleRepo = { findById: jest.fn().mockResolvedValue(null) };
    const controller = new ModuleController(
      moduleRepo as never,
      {} as never,
      {} as never
    );
    const res = createRes();
    const next = jest.fn();

    await controller.get({ params: { id: 'missing' } } as never, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'TrainingModule with identifier missing was not found'
      })
    );
  });

  it('returns module content, leaderboard and learner badges', async () => {
    const module = TrainingModule.create({
      id: 'module-2',
      name: 'Advanced',
      description: 'advanced',
      contentType: ContentType.VIDEO,
      content: { type: ContentType.VIDEO, url: 'https://cdn.example/v.mp4' },
      durationMinutes: 30,
      category: 'core',
      prerequisites: ['module-1'],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: DifficultyLevel.INTERMEDIATE
    });
    const moduleRepo = { findById: jest.fn().mockResolvedValue(module) };
    const leaderboardRepo = { getTop: jest.fn().mockResolvedValue([{ learnerId: 'l1' }]) };
    const badgeRepo = { findByLearnerId: jest.fn().mockResolvedValue([{ id: 'b1' }]) };
    const controller = new ModuleController(
      moduleRepo as never,
      leaderboardRepo as never,
      badgeRepo as never
    );
    const next = jest.fn();

    const contentRes = createRes();
    await controller.getContent({ params: { id: 'module-2' } } as never, contentRes, next);
    expect(contentRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        contentType: ContentType.VIDEO,
        content: { type: ContentType.VIDEO, url: 'https://cdn.example/v.mp4' }
      }
    });

    const leaderboardRes = createRes();
    await controller.getLeaderboard({ query: {} } as never, leaderboardRes, next);
    expect(leaderboardRepo.getTop).toHaveBeenCalledWith(10);

    const badgesRes = createRes();
    await controller.getLearnerBadges(
      { params: { learnerId: 'learner-1' } } as never,
      badgesRes,
      next
    );
    expect(badgeRepo.findByLearnerId).toHaveBeenCalledWith('learner-1');
  });
});
