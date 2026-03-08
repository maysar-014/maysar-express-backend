import { messagingConnection } from './connection';

describe('messaging connection', () => {
  it('publishes messages to console for the target topic', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const payload = { eventId: 'evt-1', type: 'auth.login' };

    await messagingConnection.publish('auth.events', payload);

    expect(consoleSpy).toHaveBeenCalledWith('Publishing to auth.events:', payload);

    consoleSpy.mockRestore();
  });
});
