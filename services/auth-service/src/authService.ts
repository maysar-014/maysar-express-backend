import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

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