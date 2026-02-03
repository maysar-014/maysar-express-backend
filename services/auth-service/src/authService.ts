import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// ADMIN SAGA EVENT HANDLERS

// User Management Saga Events
eventBus.subscribe('AdminPermissionValidationRequested', async (event) => {
  const { adminId, action, targetUserId } = event.payload;
  
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const hasPermission = admin?.role === 'ADMIN' && admin?.status === 'ACTIVE';
    
    await eventBus.publish('AdminPermissionValidated', {
      adminId, action, targetUserId, hasPermission,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('AdminPermissionValidationFailed', {
      adminId, error: error.message, correlationId: event.correlationId
    });
  }
});

eventBus.subscribe('UserCreationRequested', async (event) => {
  const { userId, adminId, userData } = event.payload;
  
  try {
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: userData.email,
        role: userData.role,
        status: 'PENDING',
        profile: userData.profile || {},
        createdBy: adminId
      }
    });
    
    await eventBus.publish('UserCreated', {
      userId: user.id, adminId, userData,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('UserCreationFailed', {
      userId, adminId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

eventBus.subscribe('UserSuspensionRequested', async (event) => {
  const { userId, adminId, reason } = event.payload;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: adminId
      }
    });
    
    await eventBus.publish('UserSuspended', {
      userId, adminId, reason,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('UserSuspensionFailed', {
      userId, adminId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

eventBus.subscribe('UserActivationRequested', async (event) => {
  const { userId, adminId } = event.payload;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        suspensionReason: null,
        suspendedAt: null,
        activatedAt: new Date(),
        activatedBy: adminId
      }
    });
    
    await eventBus.publish('UserActivated', {
      userId, adminId,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('UserActivationFailed', {
      userId, adminId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

// KYC Workflow Saga Events
eventBus.subscribe('KYCDocumentValidationRequested', async (event) => {
  const { kycId, userId, documents, adminId } = event.payload;
  
  try {
    // Validate document formats and completeness
    const validationResults = documents.map(doc => ({
      documentId: doc,
      isValid: true, // Implement actual validation logic
      issues: []
    }));
    
    await eventBus.publish('KYCDocumentValidated', {
      kycId, userId, validationResults, adminId,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('KYCDocumentValidationFailed', {
      kycId, userId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

eventBus.subscribe('KYCApproved', async (event) => {
  const { kycId, userId, adminId } = event.payload;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'APPROVED',
        kycApprovedAt: new Date(),
        kycApprovedBy: adminId
      }
    });
    
    await eventBus.publish('UserKYCApproved', {
      kycId, userId, adminId,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('KYCApprovalFailed', {
      kycId, userId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

eventBus.subscribe('KYCRejected', async (event) => {
  const { kycId, userId, adminId, rejectionReason } = event.payload;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'REJECTED',
        kycRejectedAt: new Date(),
        kycRejectedBy: adminId,
        kycRejectionReason: rejectionReason
      }
    });
    
    await eventBus.publish('UserKYCRejected', {
      kycId, userId, adminId, rejectionReason,
      correlationId: event.correlationId
    });
  } catch (error) {
    await eventBus.publish('KYCRejectionFailed', {
      kycId, userId, error: error.message,
      correlationId: event.correlationId
    });
  }
});

// User Registration - MultiRoleUserRegistrationSaga Integration
app.post('/api/auth/register', async (req, res) => {
  const { email, role, profile, sagaId } = req.body;

  try {
    const user = await prisma.user.create({
      data: { email, role, profile, status: 'PENDING_VERIFICATION' }
    });

    await eventBus.publish('UserRegistered.v1', {
      userId: user.id, email, role, profile, sagaId
    });

    res.json({ success: true, userId: user.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin User Management APIs
app.post('/api/admin/users', async (req, res) => {
  const { email, role, profile, adminId } = req.body;
  
  try {
    const user = await prisma.user.create({
      data: { email, role, profile, status: 'PENDING', createdBy: adminId }
    });
    
    await eventBus.publish('AdminUserCreated', {
      userId: user.id, email, role, adminId
    });
    
    res.json({ success: true, userId: user.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  const { role, status, page = 1, limit = 20 } = req.query;
  
  try {
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    
    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      select: {
        id: true, email: true, role: true, status: true,
        createdAt: true, lastLoginAt: true
      }
    });
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role, adminId } = req.body;
  
  try {
    await prisma.user.update({
      where: { id },
      data: { role, updatedBy: adminId }
    });
    
    await eventBus.publish('AdminUserRoleUpdated', {
      userId: id, role, adminId
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/users/:id/suspend', async (req, res) => {
  const { id } = req.params;
  const { reason, adminId } = req.body;
  
  try {
    await prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: adminId
      }
    });
    
    await eventBus.publish('AdminUserSuspended', {
      userId: id, reason, adminId
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Email Verification
app.post('/api/auth/verify-email', async (req, res) => {
  const { email, sagaId } = req.body;

  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true, status: 'EMAIL_VERIFIED' }
    });

    await eventBus.publish('EmailVerified.v1', { email, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Role Assignment
app.post('/api/auth/assign-role', async (req, res) => {
  const { email, role, sagaId } = req.body;

  try {
    await prisma.user.update({
      where: { email },
      data: { role, status: 'ROLE_ASSIGNED' }
    });

    await eventBus.publish('UserRoleAssigned.v1', { email, role, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Permission Assignment
app.post('/api/auth/assign-permissions', async (req, res) => {
  const { email, permissions, sagaId } = req.body;

  try {
    await prisma.user.update({
      where: { email },
      data: { permissions: JSON.stringify(permissions) }
    });

    await eventBus.publish('UserPermissionsAssigned.v1', { email, permissions, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Account Activation
app.post('/api/auth/activate', async (req, res) => {
  const { email, sagaId } = req.body;

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { status: 'ACTIVE', activatedAt: new Date() }
    });

    await eventBus.publish('UserAccountActivated.v1', {
      userId: user.id, email, role: user.role, sagaId
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bulk Operations - BulkUserOperationsSaga Integration
app.post('/api/auth/bulk-operations', async (req, res) => {
  const { userIds, operation, sagaId } = req.body;

  try {
    for (const userId of userIds) {
      let updateData = {};
      switch (operation) {
        case 'suspend': updateData = { status: 'SUSPENDED' }; break;
        case 'activate': updateData = { status: 'ACTIVE' }; break;
        case 'delete': updateData = { status: 'DELETED' }; break;
      }

      await prisma.user.update({ where: { id: userId }, data: updateData });
      await eventBus.publish('UserBulkOperationExecuted.v1', { userId, operation, sagaId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// User Suspension - UserSuspensionSaga Integration
app.post('/api/auth/suspend', async (req, res) => {
  const { userId, reason, duration, sagaId } = req.body;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED', suspensionReason: reason, suspendedAt: new Date() }
    });

    await eventBus.publish('UserAccountSuspended.v1', { userId, reason, duration, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));

export default app;