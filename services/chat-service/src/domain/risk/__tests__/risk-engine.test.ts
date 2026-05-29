import { RiskEngine } from '../risk-engine';

describe('RiskEngine', () => {
  const store = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
  };

  const engine = new RiskEngine(store);

  beforeEach(() => {
    jest.clearAllMocks();
    store.smembers.mockResolvedValue([]);
  });

  it('scores content with suspicious phrases and URLs', async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      'Send money here https://example.com now',
      { userId: 'user-1', messagesLast5Min: 0, sameContentConversations: 0 }
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals.urlDensity).toBeGreaterThan(0);
    expect(result.signals.suspiciousPhrase).toBeGreaterThan(0);
  });

  it('tracks message frequency and penalties using the shared store', async () => {
    store.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    store.get.mockResolvedValueOnce('2').mockResolvedValueOnce(null);

    await engine.recordMessageSent('user-1', 'hello');
    await engine.incrementMessageFrequency('user-1');

    expect(store.incr).toHaveBeenCalled();
    expect(store.expire).toHaveBeenCalledWith(expect.stringContaining('chat:ratelimit:massmsg:user-1'), 300);
    expect(await engine.getSameContentConversationCount('user-1', 'hello')).toBe(2);
    expect(await engine.getMessagesLast5Min('user-1')).toBe(0);
  });

  it('manages blocklist domains and applies penalties', async () => {
    store.smembers.mockResolvedValueOnce(['bad.example']).mockResolvedValueOnce(['bad.example']);
    store.get.mockResolvedValueOnce('85');

    await engine.addDomain('bad.example');
    await engine.removeDomain('bad.example');

    const blocklist = await engine.getBlocklist();
    const domains = await engine.listDomains();
    const score = await engine.computeSpamScore(
      'visit https://bad.example now',
      { userId: 'user-2', messagesLast5Min: 25, sameContentConversations: 10 }
    );

    expect(store.sadd).toHaveBeenCalledWith('chat:blocklist:domains', 'bad.example');
    expect(store.srem).toHaveBeenCalledWith('chat:blocklist:domains', 'bad.example');
    expect(blocklist.has('bad.example')).toBe(true);
    expect(domains).toEqual(['bad.example']);
    expect(score.signals.penaltyOverride).toBe(85);
  });
});
