const mockSetInterval = jest.spyOn(global, 'setInterval');
const mockClearInterval = jest.spyOn(global, 'clearInterval');
const mockLoggerWarn = jest.fn();

jest.mock('../../../../../shared/logger/logger', () => ({
  ServiceLogger: jest.fn().mockImplementation(() => ({
    warn: mockLoggerWarn
  }))
}));

const mockIsWebSocket = jest.fn();
const mockSend = jest.fn();
const mockClose = jest.fn();
const mockOn = jest.fn();
const mockWsCtor = jest.fn().mockImplementation(() => ({
  send: mockSend,
  close: mockClose,
  on: mockOn
}));

jest.mock('faye-websocket', () => {
  const mockConstructor = function () {
    return mockWsCtor();
  } as unknown as new (...args: unknown[]) => unknown & { isWebSocket: (...args: unknown[]) => boolean };
  (mockConstructor as any).isWebSocket = (...args: unknown[]) => mockIsWebSocket(...args);
  return mockConstructor;
});

import { WsGateway } from './ws-gateway';

describe('WsGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWebSocket.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('attaches upgrade handling and starts the heartbeat sweep', () => {
    const server = {
      on: jest.fn()
    } as any;
    const gateway = new WsGateway(
      { findByParticipant: jest.fn() } as never,
      { findByConversation: jest.fn() } as never,
      { setOnline: jest.fn(), refresh: jest.fn() } as never,
      { subscribe: jest.fn() } as never,
      jest.fn()
    );

    gateway.attach(server);
    void gateway.shutdown();

    expect(server.on).toHaveBeenCalledWith('upgrade', expect.any(Function));
    expect(mockSetInterval).toHaveBeenCalled();
  });

  it('shuts down active connections and clears heartbeat interval', async () => {
    const gateway = new WsGateway(
      { findByParticipant: jest.fn() } as never,
      { findByConversation: jest.fn() } as never,
      { setOnline: jest.fn(), refresh: jest.fn() } as never,
      { subscribe: jest.fn() } as never,
      jest.fn()
    );

    (gateway as any).connections.set('user-1', new Set([
      { ws: { close: mockClose }, userId: 'user-1', isAlive: true }
    ]));
    (gateway as any).heartbeatInterval = setInterval(() => undefined, 1);

    await gateway.shutdown();

    expect(mockClearInterval).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect((gateway as any).connections.size).toBe(0);
  });
});
