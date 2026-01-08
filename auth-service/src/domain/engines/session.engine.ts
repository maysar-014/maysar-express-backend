export interface SessionData {
  userId: string;
  role: string;
  permissions: string[];
  lastActivity: Date;
  deviceInfo: string;
  ipAddress: string;
}

export interface SessionResult {
  valid: boolean;
  session?: SessionData;
  expiresIn?: number;
  refreshRequired?: boolean;
}

export class SessionEngine {
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly REFRESH_THRESHOLD = 300; // 5 minutes
  private readonly MAX_SESSIONS_PER_USER = 5;

  async createSession(userId: string, role: string, deviceInfo: string, ipAddress: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const permissions = await this.getPermissionsForRole(role);
    
    const sessionData: SessionData = {
      userId,
      role,
      permissions,
      lastActivity: new Date(),
      deviceInfo,
      ipAddress
    };

    // Store session with TTL
    await this.redis.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(sessionData));
    
    // Track user sessions for cleanup
    await this.addUserSession(userId, sessionId);
    
    return sessionId;
  }

  async validateSession(sessionId: string): Promise<SessionResult> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (!sessionData) return { valid: false };

    const session: SessionData = JSON.parse(sessionData);
    const ttl = await this.redis.ttl(`session:${sessionId}`);
    
    // Update last activity
    session.lastActivity = new Date();
    await this.redis.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(session));

    return {
      valid: true,
      session,
      expiresIn: ttl,
      refreshRequired: ttl < this.REFRESH_THRESHOLD
    };
  }

  async refreshSession(sessionId: string): Promise<boolean> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (!sessionData) return false;

    // Extend TTL
    await this.redis.expire(`session:${sessionId}`, this.SESSION_TTL);
    return true;
  }

  async terminateSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session: SessionData = JSON.parse(sessionData);
      await this.removeUserSession(session.userId, sessionId);
    }
    await this.redis.del(`session:${sessionId}`);
  }

  async terminateAllUserSessions(userId: string): Promise<void> {
    const userSessions = await this.redis.smembers(`user:${userId}:sessions`);
    const pipeline = this.redis.pipeline();
    
    userSessions.forEach(sessionId => {
      pipeline.del(`session:${sessionId}`);
    });
    pipeline.del(`user:${userId}:sessions`);
    
    await pipeline.exec();
  }

  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);
    
    // Cleanup old sessions if limit exceeded
    const sessionCount = await this.redis.scard(`user:${userId}:sessions`);
    if (sessionCount > this.MAX_SESSIONS_PER_USER) {
      const oldestSessions = await this.redis.spop(`user:${userId}:sessions`, sessionCount - this.MAX_SESSIONS_PER_USER);
      if (Array.isArray(oldestSessions)) {
        oldestSessions.forEach(sessionId => this.redis.del(`session:${sessionId}`));
      }
    }
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    await this.redis.srem(`user:${userId}:sessions`, sessionId);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getPermissionsForRole(role: string): Promise<string[]> {
    const rolePermissions: Record<string, string[]> = {
      buyer: ['view_products', 'create_orders', 'view_own_orders'],
      seller: ['manage_products', 'view_orders', 'update_inventory'],
      courier: ['view_deliveries', 'update_delivery_status'],
      supplier: ['manage_bulk_orders', 'view_production'],
      admin: ['*']
    };
    return rolePermissions[role] || [];
  }
}