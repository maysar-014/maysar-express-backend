/**
 * Request lifecycle + access control (Phase 1 §1.1 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { ListRequestsUseCase } from '../list-requests.use-case';
import { GetRequestUseCase } from '../get-request.use-case';
import { CancelRequestUseCase } from '../cancel-request.use-case';
import {
  FakeRequestRepository,
  FakeMessageRepository,
  silenceOutbox,
} from './fakes';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../../shared/errors/api-errors';

describe('CreateRequestUseCase (§1.1)', () => {
  let requestRepo: FakeRequestRepository;
  let messageRepo: FakeMessageRepository;
  let useCase: CreateRequestUseCase;

  const validInput = {
    title: 'CCTV setup',
    description: 'Nahitaji vifaa vya CCTV kwa biashara yangu',
    deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam' },
  };

  beforeAll(() => silenceOutbox());

  beforeEach(() => {
    requestRepo = new FakeRequestRepository();
    messageRepo = new FakeMessageRepository();
    useCase = new CreateRequestUseCase(requestRepo, messageRepo);
  });

  it('happy path — persists SUBMITTED, posts a STATUS message', async () => {
    const result = await useCase.execute('usr_customer', validInput);

    expect(result.request.status).toBe('SUBMITTED');
    expect(result.request.customerId).toBe('usr_customer');
    const stored = await requestRepo.findById(result.request.id);
    expect(stored).not.toBeNull();

    const messages = await messageRepo.listByRequest(result.request.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].authorType).toBe('STATUS');
  });

  it('rejects when the auth context is missing (customerId empty)', async () => {
    await expect(useCase.execute('', validInput)).rejects.toThrow(ValidationError);
  });

  it('rejects a blank description', async () => {
    await expect(
      useCase.execute('usr_customer', { ...validInput, description: ' ' }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects a delivery address without city/region', async () => {
    await expect(
      useCase.execute('usr_customer', { ...validInput, deliveryAddress: { city: '' } as any }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('Access control (§1.1)', () => {
  let requestRepo: FakeRequestRepository;
  let getUseCase: GetRequestUseCase;
  let requestId: string;

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    const create = new CreateRequestUseCase(requestRepo, new FakeMessageRepository());
    const result = await create.execute('usr_owner', {
      title: 'T',
      description: 'Need a generator for my shop',
      deliveryAddress: { city: 'Dodoma', region: 'Dodoma' },
    });
    requestId = result.request.id;
    getUseCase = new GetRequestUseCase(requestRepo);
  });

  it('the owner can read their own request', async () => {
    const r = await getUseCase.execute('usr_owner', requestId);
    expect(r.id).toBe(requestId);
  });

  it('another customer gets 403', async () => {
    await expect(getUseCase.execute('usr_other', requestId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('unknown request → 404', async () => {
    await expect(getUseCase.execute('usr_owner', 'req_missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListRequests + CancelRequest (§1.1)', () => {
  let requestRepo: FakeRequestRepository;
  let messageRepo: FakeMessageRepository;

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    messageRepo = new FakeMessageRepository();
    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    await create.execute('usr_a', {
      title: 'A',
      description: 'Need a',
      deliveryAddress: { city: 'X', region: 'Y' },
    });
    await create.execute('usr_b', {
      title: 'B',
      description: 'Need b',
      deliveryAddress: { city: 'X', region: 'Y' },
    });
  });

  it('list returns only the caller’s own requests', async () => {
    const list = new ListRequestsUseCase(requestRepo);
    const page = await list.execute('usr_a', {});
    expect(page.items).toHaveLength(1);
    expect(page.items[0].customerId).toBe('usr_a');
  });

  it('cancel transitions to CANCELLED + posts a STATUS message', async () => {
    const cancel = new CancelRequestUseCase(requestRepo, messageRepo);
    const page = await new ListRequestsUseCase(requestRepo).execute('usr_a', {});
    const cancelled = await cancel.execute('usr_a', page.items[0].id);
    expect(cancelled.status).toBe('CANCELLED');

    const messages = await messageRepo.listByRequest(page.items[0].id);
    expect(messages.some((m) => m.authorType === 'STATUS' && m.body.includes('cancelled'))).toBe(true);
  });

  it('another customer cannot cancel someone else’s request', async () => {
    const cancel = new CancelRequestUseCase(requestRepo, messageRepo);
    const page = await new ListRequestsUseCase(requestRepo).execute('usr_a', {});
    await expect(cancel.execute('usr_b', page.items[0].id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});