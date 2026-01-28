import { Router } from 'express';
import { UserController } from '@api/controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { UserValidationService } from '@domain/services/user-validation.service';
import { UserSecurityPolicy } from '@domain/policies/user-security.policy';

/**
 * User Routes
 * Defines all user-related API endpoints
 */
export function createUserRoutes(): Router {
  const router = Router();
  
  // Initialize dependencies
  const userValidationService = new UserValidationService();
  const userSecurityPolicy = new UserSecurityPolicy();
  const createUserUseCase = new CreateUserUseCase(
    userValidationService,
    userSecurityPolicy
  );
  
  const userController = new UserController(
    createUserUseCase
  );

  /**
   * @route   POST /api/users
   * @desc    Create a new user
   * @access  Public
   */
  router.post('/', async (req, res) => {
    await userController.createUser(req, res);
  });

  /**
   * @route   GET /api/users/:id
   * @desc    Get user by ID
   * @access  Private
   */
  router.get('/:id', async (req, res) => {
    await userController.getUserById(req, res);
  });

  /**
   * @route   PUT /api/users/:id
   * @desc    Update user
   * @access  Private
   */
  router.put('/:id', async (req, res) => {
    await userController.updateUser(req, res);
  });

  /**
   * @route   DELETE /api/users/:id
   * @desc    Delete user
   * @access  Private
   */
  router.delete('/:id', async (req, res) => {
    await userController.deleteUser(req, res);
  });

  /**
   * @route   POST /api/users/verify-email/:token
   * @desc    Verify user email
   * @access  Public
   */
  router.post('/verify-email/:token', async (req, res) => {
    await userController.verifyEmail(req, res);
  });

  /**
   * @route   POST /api/users/request-password-reset
   * @desc    Request password reset
   * @access  Public
   */
  router.post('/request-password-reset', async (req, res) => {
    await userController.requestPasswordReset(req, res);
  });

  /**
   * @route   POST /api/users/reset-password/:token
   * @desc    Reset password
   * @access  Public
   */
  router.post('/reset-password/:token', async (req, res) => {
    await userController.resetPassword(req, res);
  });

  /**
   * @route   GET /api/users/profile
   * @desc    Get user profile
   * @access  Private
   */
  router.get('/profile', async (req, res) => {
    await userController.getProfile(req, res);
  });

  /**
   * @route   PUT /api/users/profile
   * @desc    Update user profile
   * @access  Private
   */
  router.put('/profile', async (req, res) => {
    await userController.updateProfile(req, res);
  });

  return router;
}