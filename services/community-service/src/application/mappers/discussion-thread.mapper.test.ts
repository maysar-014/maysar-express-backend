import {
  DiscussionThread,
  ExpertiseLevel,
  ThreadStatus
} from '../../domain/entities/discussion-thread.entity';
import { DiscussionThreadMapper } from './discussion-thread.mapper';

const buildEntity = (): DiscussionThread =>
  new DiscussionThread({
    id: 'thread-1',
    authorId: 'user-1',
    topic: 'How to improve retention for first-time customers?',
    content: 'Looking for practical retention tactics for our first-time customer segment in FMCG.',
    category: 'growth',
    status: ThreadStatus.ACTIVE,
    expertiseLevel: ExpertiseLevel.INTERMEDIATE,
    businessContext: {
      industry: ['fmcg'],
      businessStage: 'growth',
      tags: ['retention', 'crm']
    },
    maxResponsesPerUser: 3,
    acceptedAnswerId: 'answer-1',
    resolvedAt: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-02T00:00:00.000Z')
  });

describe('DiscussionThreadMapper', () => {
  it('maps entity to dto and list dto', () => {
    const entity = buildEntity();
    const dto = DiscussionThreadMapper.toDTO(entity);
    const list = DiscussionThreadMapper.toDTOList([entity]);

    expect(dto.id).toBe('thread-1');
    expect(dto.status).toBe(ThreadStatus.ACTIVE);
    expect(dto.createdAt).toBe('2026-02-01T00:00:00.000Z');
    expect(list).toHaveLength(1);
  });

  it('maps dto back to entity', () => {
    const dto = DiscussionThreadMapper.toDTO(buildEntity());
    const entity = DiscussionThreadMapper.toEntity(dto);

    expect(entity).toBeInstanceOf(DiscussionThread);
    expect(entity.id).toBe('thread-1');
    expect(entity.businessContext.tags).toEqual(['retention', 'crm']);
  });
});
