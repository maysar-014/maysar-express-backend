/**
 * Provider assessment (Phase 1 §1.3 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { ListProviderRequestsUseCase } from '../list-provider-requests.use-case';
import { FakeRequestRepository, FakeMessageRepository, FakeAssessmentRepository, silenceOutbox } from './fakes';
import { ForbiddenError, ValidationError } from '../../../../../../shared/errors/api-errors';

describe('Provider assessment (§1.3)', () => {
  let requestRepo: FakeRequestRepository;
  let assessmentRepo: FakeAssessmentRepository;
  let messageRepo: FakeMessageRepository;
  let assess: AssessRequestUseCase;
  let requestId: string;

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    assessmentRepo = new FakeAssessmentRepository();
    messageRepo = new FakeMessageRepository();
    assess = new AssessRequestUseCase(requestRepo, assessmentRepo, messageRepo);

    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    requestId = (await create.execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
  });

  it('FULFILLABLE decision transitions the request + persists the assessment row', async () => {
    const result = await assess.execute('usr_provider', requestId, {
      decision: 'FULFILLABLE',
      internalNotes: 'Sourced from Supplier A',
    });

    expect(result.request.status).toBe('FULFILLABLE');
    expect(result.assessment.decision).toBe('FULFILLABLE');
    expect(result.assessment.providerId).toBe('usr_provider');
    expect(await assessmentRepo.listByRequest(requestId)).toHaveLength(1);
  });

  it('NEEDS_CLARIFICATION auto-posts a STATUS message', async () => {
    await assess.execute('usr_provider', requestId, { decision: 'NEEDS_CLARIFICATION' });
    const messages = await messageRepo.listByRequest(requestId);
    expect(messages.some((m) => m.authorType === 'STATUS' && m.body.includes('more information'))).toBe(true);
  });

  it('UNFULFILLABLE without a reason is rejected', async () => {
    await expect(assess.execute('usr_provider', requestId, { decision: 'UNFULFILLABLE' })).rejects.toThrow(
      'UNFULFILLABLE requires unfulfillableReason',
    );
  });

  it('UNFULFILLABLE with a reason transitions + records', async () => {
    const result = await assess.execute('usr_provider', requestId, {
      decision: 'UNFULFILLABLE',
      unfulfillableReason: 'Product discontinued by all suppliers',
    });
    expect(result.request.status).toBe('UNFULFILLABLE');
    expect(result.request.unfulfillableReason).toBe('Product discontinued by all suppliers');
  });

  it('a non-assigned provider gets 403', async () => {
    await expect(
      assess.execute('usr_other_provider', requestId, { decision: 'FULFILLABLE' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('unknown request → NotFound', async () => {
    await expect(assess.execute('usr_provider', 'req_missing', { decision: 'FULFILLABLE' })).rejects.toMatchObject({
      httpStatus: 404,
    });
  });

  it('provider queue shows assigned + unassigned requests', async () => {
    const list = new ListProviderRequestsUseCase(requestRepo);
    const queue = await list.execute('usr_provider', {});
    expect(queue.items.some((r) => r.id === requestId)).toBe(true);
  });

  it('AssignRequestProviderUseCase rejects a missing providerId', async () => {
    await expect(new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, '')).rejects.toThrow(
      ValidationError,
    );
  });
});