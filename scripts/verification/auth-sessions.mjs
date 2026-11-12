// scripts/verification/auth-sessions.mjs
import { makeRequest, FlowError } from './http-client.mjs';

export class AuthSessionManager {
  constructor(config, entityRegistry) {
    this.config = config;
    this.registry = entityRegistry;
    this.sessions = {};
  }

  getCtx() {
    return { sessions: this.sessions, config: this.config };
  }

  async getSession(role) {
    const session = this.sessions[role];
    if (!session) throw new Error(`No session for role: ${role}`);
    // Refresh if within 60 seconds of expiry
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt - Date.now() < 60_000) {
      await this._refreshSession(role);
    }
    return this.sessions[role];
  }

  async _refreshSession(role) {
    const session = this.sessions[role];
    if (!session?.refreshToken) return;
    try {
      const ctx = this.getCtx();
      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/refresh',
        body: { refreshToken: session.refreshToken },
      }, ctx);
      if (res.data?.token) {
        this.sessions[role] = {
          ...session,
          jwt: res.data.token,
          expiresAt: new Date(Date.now() + 3600_000),
        };
      }
    } catch {
      // Silently fail — the existing token will be used
    }
  }

  async _registerAndLogin(role, emailSuffix, password = 'TestPassword123!') {
    const email = this.registry.prefixEmail(`${emailSuffix}@test.maysar`);
    const ctx = this.getCtx();

    // Register
    try {
      await makeRequest({
        method: 'POST',
        path: '/api/auth/register',
        body: { email, password, role: role.toUpperCase().replace(' ', '_'), name: this.registry.prefixName(emailSuffix) },
      }, ctx);
    } catch (err) {
      // Ignore 409 Conflict (user already exists)
      if (err.status !== 409) throw err;
    }

    // Login
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email, password },
    }, ctx);

    const jwt = loginRes.data?.token || loginRes.data?.accessToken;
    const userId = loginRes.data?.user?.id || loginRes.data?.userId;
    const refreshToken = loginRes.data?.refreshToken;

    if (!jwt) throw new Error(`Login did not return a JWT for role ${role}`);

    this.sessions[role] = {
      role,
      userId,
      email,
      jwt,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600_000),
    };

    this.registry.register('users', { id: userId, email, role });
    return { userId, email, jwt };
  }

  async initializeBuyer() {
    return this._registerAndLogin('Buyer', 'buyer');
  }

  async initializeSeller() {
    return this._registerAndLogin('Seller', 'seller');
  }

  async initializeCourier() {
    return this._registerAndLogin('Courier', 'courier');
  }

  async initializeEnabler() {
    return this._registerAndLogin('Enabler', 'enabler');
  }

  async initializeSupplier() {
    return this._registerAndLogin('Supplier', 'supplier');
  }

  async initializeAdmin() {
    const result = await this._registerAndLogin('Admin', 'admin');
    // Note: 2FA setup is complex and requires TOTP — for now, use the basic session
    // Full 2FA onboarding is handled by the admin flows themselves
    return result;
  }

  async initializeSupportAgent() {
    // Support agents are created by admins — register as admin first if needed
    return this._registerAndLogin('support-agent', 'support-agent');
  }

  async initializePlatformOperator() {
    return this._registerAndLogin('platform-operator', 'platform-operator');
  }

  async initializeComplianceOfficer() {
    return this._registerAndLogin('compliance-officer', 'compliance-officer');
  }

  async initializeAllRoles() {
    const roleInits = [
      () => this.initializeAdmin(),
      () => this.initializeBuyer(),
      () => this.initializeSeller(),
      () => this.initializeCourier(),
      () => this.initializeEnabler(),
      () => this.initializeSupplier(),
      () => this.initializeSupportAgent(),
      () => this.initializePlatformOperator(),
      () => this.initializeComplianceOfficer(),
    ];

    const results = [];
    for (const init of roleInits) {
      try {
        results.push(await init());
      } catch (err) {
        // Record partial failure but continue — some roles may not be available
        console.warn(`[auth-sessions] Warning: failed to initialize role:`, err.message);
        results.push(null);
      }
    }
    return results;
  }
}
