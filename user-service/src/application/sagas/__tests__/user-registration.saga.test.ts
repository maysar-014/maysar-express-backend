import { executeUserRegistrationSaga, UserRegistrationSaga } from '../user-registration.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('User Registration Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRegistrationSaga initialization', () => {
    test('creates saga with event and correlation ID', () => {
      const event = {
        eventId: 'evt-1',
        aggregateId: 'user-1',
        metadata: { correlationId: 'corr-1' }
      };

      const saga = new UserRegistrationSaga(event as any);
      expect(saga).toBeDefined();
    });

    test('generates correlation ID if not provided in metadata', () => {
      const event = {
        eventId: 'evt-2',
        aggregateId: 'user-2'
      };

      const saga = new UserRegistrationSaga(event as any);
      expect(saga).toBeDefined();
    });

    test('generates correlation ID if metadata is undefined', () => {
      const event = {
        eventId: 'evt-3',
        aggregateId: 'user-3',
        metadata: undefined
      };

      const saga = new UserRegistrationSaga(event as any);
      expect(saga).toBeDefined();
    });
  });

  describe('executeUserRegistrationSaga success path', () => {
    test('executes registration saga successfully', async () => {
      const event = {
        eventId: 'evt-4',
        aggregateId: 'user-4',
        metadata: { correlationId: 'corr-4' }
      };

      await executeUserRegistrationSaga(event as any);
      expect(logger.info).toHaveBeenCalledWith('User registration saga completed successfully', expect.any(Object));
    });

    test('logs correlation ID on success', async () => {
      const event = {
        eventId: 'evt-5',
        aggregateId: 'user-5',
        metadata: { correlationId: 'corr-5' }
      };

      await executeUserRegistrationSaga(event as any);
      expect(logger.info).toHaveBeenCalledWith('User registration saga completed successfully', expect.objectContaining({
        correlationId: 'corr-5'
      }));
    });

    test('logs userId on success', async () => {
      const event = {
        eventId: 'evt-6',
        aggregateId: 'user-6',
        metadata: { correlationId: 'corr-6' }
      };

      await executeUserRegistrationSaga(event as any);
      expect(logger.info).toHaveBeenCalledWith('User registration saga completed successfully', expect.objectContaining({
        userId: 'user-6'
      }));
    });

    test('executes saga with generated correlation ID', async () => {
      const event = {
        eventId: 'evt-7',
        aggregateId: 'user-7'
      };

      await executeUserRegistrationSaga(event as any);
      expect(logger.info).toHaveBeenCalledWith('User registration saga completed successfully', expect.any(Object));
    });
  });

  describe('executeUserRegistrationSaga error path', () => {
    test('handles registration saga failure', async () => {
      const event = {
        eventId: 'evt-8',
        aggregateId: 'user-8',
        metadata: { correlationId: 'corr-8' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(new Error('Registration failed'));

      await expect(executeUserRegistrationSaga(event as any)).rejects.toThrow('Registration failed');
      expect(logger.error).toHaveBeenCalled();
    });

    test('logs error message on failure', async () => {
      const event = {
        eventId: 'evt-9',
        aggregateId: 'user-9',
        metadata: { correlationId: 'corr-9' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(new Error('Email send failed'));

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        error: 'Email send failed'
      }));
    });

    test('logs userId and correlationId on failure', async () => {
      const event = {
        eventId: 'evt-10',
        aggregateId: 'user-10',
        metadata: { correlationId: 'corr-10' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(new Error('Saga error'));

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        userId: 'user-10',
        correlationId: 'corr-10'
      }));
    });

    test('logs error with stack trace on failure', async () => {
      const event = {
        eventId: 'evt-11',
        aggregateId: 'user-11',
        metadata: { correlationId: 'corr-11' }
      };

      const testError = new Error('Test error');
      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(testError);

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        error: 'Test error'
      }));
    });

    test('handles non-Error rejection', async () => {
      const event = {
        eventId: 'evt-12',
        aggregateId: 'user-12',
        metadata: { correlationId: 'corr-12' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce('String error');

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.any(Object));
    });
  });

  describe('withRetry error handling branches', () => {
    test('logs error instance in catch block', async () => {
      const event = {
        eventId: 'evt-13',
        aggregateId: 'user-13',
        metadata: { correlationId: 'corr-13' }
      };

      const customError = new Error('Custom error');
      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(customError);

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        error: 'Custom error'
      }));
    });

    test('handles non-Error in catch block', async () => {
      const event = {
        eventId: 'evt-14',
        aggregateId: 'user-14',
        metadata: { correlationId: 'corr-14' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce({ message: 'Object error' });

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalled();
    });

    test('logs stack trace when available', async () => {
      const event = {
        eventId: 'evt-15',
        aggregateId: 'user-15',
        metadata: { correlationId: 'corr-15' }
      };

      const errorWithStack = new Error('Error with stack');
      errorWithStack.stack = 'at test.ts:1:1';
      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(errorWithStack);

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        stack: 'at test.ts:1:1'
      }));
    });

    test('handles undefined stack trace', async () => {
      const event = {
        eventId: 'evt-16',
        aggregateId: 'user-16',
        metadata: { correlationId: 'corr-16' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(new Error('No stack'));

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalled();
    });

    test('logs error with all context fields', async () => {
      const event = {
        eventId: 'evt-17',
        aggregateId: 'user-17',
        metadata: { correlationId: 'corr-17' }
      };

      jest.spyOn(UserRegistrationSaga.prototype, 'execute').mockRejectedValueOnce(new Error('Full context error'));

      try {
        await executeUserRegistrationSaga(event as any);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed', expect.objectContaining({
        userId: 'user-17',
        correlationId: 'corr-17',
        error: 'Full context error'
      }));
    });
  });
});
