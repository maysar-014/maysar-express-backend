/**
 * WebSocket Gateway for the Maysar Chat System.
 *
 * Uses Node's built-in `http` upgrade event + faye-websocket (already a
 * transitive dependency via firebase-admin) so no new package is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FayeWebSocket = require('faye-websocket') as {
  isWebSocket: (req: unknown) => boolean;
  new (req: unknown, res: unknown, head: unknown, protocols?: string[]): FayeWs;
};

interface FayeWs {
  send(data: string): void;
  close(): void;
  on(event: 'message', handler: (e: { data: string }) => void): void;
  on(event: 'close', handler: () => void): void;
  on(event: 'error', handler: (e: Error) => void): void;
  on(event: 'open', handler: () => void): void;
}

import type { IncomingMessage, ServerResponse, Server } from 'http';
import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { MessageRepository } from '../../domain/repositories/message.repository.interface';
import type { RedisPresenceStore } from '../redis/presence.store';
import type { RedisPubSub } from '../redis/pubsub';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('WsGateway', 'chat-service');

interface AuthenticatedSocket {
  ws: FayeWs;
  userId: string;
  isAlive: boolean;
}

interface WsInboundMessage {
  type: 'heartbeat' | 'read_receipt';
  conversationId?: string;
}

export class WsGateway {
  /** userId → set of sockets (user may have multiple tabs) */
  private readonly connections = new Map<string, Set<AuthenticatedSocket>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly presence: RedisPresenceStore,
    private readonly pubSub: RedisPubSub,
    private readonly onReadReceipt: (conversationId: string, userId: string) => Promise<void>,
  ) {}

  // ─── Attach to HTTP server ─────────────────────────────────────────────────

  attach(server: Server): void {
    server.on('upgrade', (req: IncomingMessage, socket: ServerResponse, head: Buffer) => {
      if (!FayeWebSocket.isWebSocket(req)) return;

      const userId = this.extractUserId(req);
      if (!userId) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return;
      }

      const ws: FayeWs = new FayeWebSocket(req, socket, head);
      const conn: AuthenticatedSocket = { ws, userId, isAlive: true };

      ws.on('open', () => void this.handleConnection(conn));
      ws.on('message', (e) => void this.handleInbound(conn, e.data));
      ws.on('close', () => void this.handleDisconnect(conn));
      ws.on('error', (err) => logger.warn('WS error', { userId, err: err.message }));
    });

    // Heartbeat sweep every 30s
    this.heartbeatInterval = setInterval(() => this.sweepDeadConnections(), 30_000);
  }

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  private async handleConnection(conn: AuthenticatedSocket): Promise<void> {
    const { userId } = conn;

    if (!this.connections.has(userId)) this.connections.set(userId, new Set());
    this.connections.get(userId)!.add(conn);

    await this.presence.setOnline(userId);

    // Subscribe to all user's conversation channels
    const { conversations } = await this.conversationRepo.findByParticipant(userId, { limit: 100 });
    for (const conv of conversations) {
      await this.pubSub.subscribe(conv.id, (payload) => this.fanOut(conv.id, payload));
    }

    // Deliver unread messages since lastReadAt
    await this.deliverUnread(conn, userId, conversations);

    // Broadcast presence change
    this.broadcastPresence(userId, true);
  }

  private async handleDisconnect(conn: AuthenticatedSocket): Promise<void> {
    const { userId } = conn;
    const sockets = this.connections.get(userId);
    if (sockets) {
      sockets.delete(conn);
      if (sockets.size === 0) {
        this.connections.delete(userId);
        this.broadcastPresence(userId, false);
      }
    }
  }

  private async handleInbound(conn: AuthenticatedSocket, raw: string): Promise<void> {
    let msg: WsInboundMessage;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'heartbeat') {
      conn.isAlive = true;
      await this.presence.refresh(conn.userId);
    }

    if (msg.type === 'read_receipt' && msg.conversationId) {
      try {
        await this.onReadReceipt(msg.conversationId, conn.userId);
      } catch (err) {
        logger.warn('read_receipt failed', { userId: conn.userId, err });
      }
    }
  }

  // ─── Fan-out ───────────────────────────────────────────────────────────────

  private fanOut(_conversationId: string, payload: unknown): void {
    const json = JSON.stringify(payload);
    for (const [, sockets] of this.connections) {
      for (const conn of sockets) {
        try { conn.ws.send(json); } catch { /* ignore closed sockets */ }
      }
    }
  }

  // ─── Unread delivery on reconnect ─────────────────────────────────────────

  private async deliverUnread(
    conn: AuthenticatedSocket,
    userId: string,
    conversations: Array<{ id: string }>,
  ): Promise<void> {
    for (const conv of conversations) {
      const participants = await this.conversationRepo.getParticipants(conv.id);
      const participant = participants.find((p) => p.userId === userId);
      if (!participant) continue;

      const { messages } = await this.messageRepo.findByConversation(conv.id, {
        limit: 50,
        cursor: participant.lastReadAt?.toISOString(),
      });

      for (const msg of messages) {
        try { conn.ws.send(JSON.stringify({ type: 'message', data: msg })); } catch { /* ignore */ }
      }
    }
  }

  // ─── Presence broadcast ────────────────────────────────────────────────────

  private broadcastPresence(userId: string, online: boolean): void {
    const payload = JSON.stringify({ type: 'presence', data: { userId, online } });
    for (const [, sockets] of this.connections) {
      for (const conn of sockets) {
        try { conn.ws.send(payload); } catch { /* ignore */ }
      }
    }
  }

  // ─── Heartbeat sweep ───────────────────────────────────────────────────────

  private sweepDeadConnections(): void {
    for (const [, sockets] of this.connections) {
      for (const conn of sockets) {
        if (!conn.isAlive) {
          conn.ws.close();
          continue;
        }
        conn.isAlive = false;
        // Send a ping frame via a heartbeat message
        try { conn.ws.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
      }
    }
  }

  // ─── Auth helper ───────────────────────────────────────────────────────────

  private extractUserId(req: IncomingMessage): string | null {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const userIdParam = url.searchParams.get('userId');
    if (userIdParam) return userIdParam;
    const header = req.headers['x-user-id'];
    return typeof header === 'string' ? header : null;
  }

  // ─── Shutdown ──────────────────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const [, sockets] of this.connections) {
      for (const conn of sockets) {
        try { conn.ws.close(); } catch { /* ignore */ }
      }
    }
    this.connections.clear();
  }
}
