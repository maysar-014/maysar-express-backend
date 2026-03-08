const mockAdminRepository = {
  getUserById: jest.fn(),
  updateUserStatus: jest.fn(),
  updateUserRole: jest.fn(),
  searchUsers: jest.fn(),
  getUserSessions: jest.fn(),
  terminateUserSessions: jest.fn(),
  terminateSession: jest.fn()
};

const mockAuditService = {
  logAuditEvent: jest.fn(),
  getAuditLogs: jest.fn()
};

const mockSecurityService = {
  logSecurityEvent: jest.fn(),
  getSecurityEvents: jest.fn()
};

const mockSystemService = {
  getSystemStats: jest.fn(),
  getServiceHealth: jest.fn()
};

const mockServiceDiscovery = {
  refresh: jest.fn()
};

const mockLoggerError = jest.fn();

jest.mock('../../infrastructure/repositories/admin.repository', () => ({
  adminRepository: mockAdminRepository
}));

jest.mock('./audit.service', () => ({
  auditService: mockAuditService
}));

jest.mock('./security.service', () => ({
  securityService: mockSecurityService
}));

jest.mock('./system.service', () => ({
  systemService: mockSystemService
}));

jest.mock('../../infrastructure/services/service-discovery.service', () => ({
  serviceDiscovery: mockServiceDiscovery
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: mockLoggerError,
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService();
  });

  it('returns sanitized user profile when found', async () => {
    mockAdminRepository.getUserById.mockResolvedValue({
      userId: 'u1',
      email: 'user@example.com',
      role: 'seller',
      status: 'active',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      lastLoginAt: new Date('2026-03-07T00:00:00.000Z'),
      permissions: ['read']
    });

    const result = await service.getUserById('u1');

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'u1',
        email: 'user@example.com',
        role: 'seller',
        status: 'active',
        permissions: ['read']
      })
    );
    expect(mockAuditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'GET_USER' })
    );
  });

  it('validates user status updates and triggers session termination for locked users', async () => {
    const terminateSpy = jest
      .spyOn(service, 'terminateUserSessions')
      .mockResolvedValue({ userId: 'u1', terminatedCount: 2, reason: 'lock' });

    mockAdminRepository.updateUserStatus.mockResolvedValue({ ok: true });

    const result = await service.updateUserStatus('u1', 'locked', 'security');

    expect(mockAdminRepository.updateUserStatus).toHaveBeenCalledWith('u1', 'locked', 'security');
    expect(terminateSpy).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        userId: 'u1',
        status: 'locked',
        reason: 'security'
      })
    );
  });

  it('rejects invalid statuses', async () => {
    await expect(service.updateUserStatus('u1', 'invalid')).rejects.toThrow('Invalid status');
    expect(mockAdminRepository.updateUserStatus).not.toHaveBeenCalled();
  });

  it('returns system health and logs audit action', async () => {
    mockSystemService.getServiceHealth.mockResolvedValue({ auth: 'healthy' });

    const result = await service.getServiceHealth();

    expect(result).toEqual({ auth: 'healthy' });
    expect(mockAuditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'GET_SERVICE_HEALTH' })
    );
  });
});
