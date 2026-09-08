/**
 * Conversation (Phase 1 §1.2 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { PostMessageUseCase } from '../post-message.use-case';
import { ListMessagesUseCase } from '../list-messages.use-case';
import { FakeRequestRepository, FakeMessageRepository, silenceOutbox } from './fakes';
import { ForbiddenError, ValidationError } from '../../../../../../shared/errors/api-errors';

describe('Conversation (§1.2)', () => {
  let requestRepo: FakeRequestRepository;
  let messageRepo: FakeMessageRepository;
  let requestId: string;

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    messageRepo = new FakeMessageRepository();
    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    requestId = (await create.execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;
  });

  it('customer posts CUSTOMER messages; history is chronological', async () => {
    const post = new PostMessageUseCase(requestRepo, messageRepo);
    const list = new ListMessagesUseCase(requestRepo, messageRepo);

    await post.execute({ id: 'usr_customer', role: 'customer' }, requestId, { body: 'first' });
    await post.execute({ id: 'usr_customer', role: 'customer' }, requestId, { body: 'second' });

    const messages = await list.execute({ id: 'usr_customer', role: 'customer' }, requestId);
    expect(messages.map((m) => m.body)).toEqual([
      'Your request has been submitted and is awaiting Maysar assessment.',
      'first',
      'second',
    ]);
  });

  it('customer cannot post as MAYSAR_PROVIDER (authorType is never client-controlled)', async () => {
    const post = new PostMessageUseCase(requestRepo, messageRepo);
    const message = await post.execute({ id: 'usr_customer', role: 'customer' }, requestId, { body: 'hi' });
    expect(message.authorType).toBe('CUSTOMER');
    expect(message.authorId).toBe('usr_customer');
  });

  it('the assigned provider posts MAYSAR_PROVIDER messages', async () => {
    const request = await requestRepo.findById(requestId);
    request!.assignProvider('usr_provider');
    await requestRepo.save(request!);

    const post = new PostMessageUseCase(requestRepo, messageRepo);
    const message = await post.execute({ id: 'usr_provider', role: 'provider' }, requestId, { body: 'checking availability' });
    expect(message.authorType).toBe('MAYSAR_PROVIDER');
    expect(message.authorId).toBe('usr_provider');
  });

  it('a non-assigned provider cannot post', async () => {
    const post = new PostMessageUseCase(requestRepo, messageRepo);
    await expect(
      post.execute({ id: 'usr_other_provider', role: 'provider' }, requestId, { body: 'hi' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('another customer cannot read the conversation', async () => {
    const list = new ListMessagesUseCase(requestRepo, messageRepo);
    await expect(list.execute({ id: 'usr_other', role: 'customer' }, requestId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects a blank message body', async () => {
    const post = new PostMessageUseCase(requestRepo, messageRepo);
    await expect(
      post.execute({ id: 'usr_customer', role: 'customer' }, requestId, { body: ' ' }),
    ).rejects.toThrow(ValidationError);
  });
});