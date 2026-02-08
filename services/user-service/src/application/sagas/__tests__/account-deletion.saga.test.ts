import { AccountDeletionSaga, executeAccountDeletionSaga } from '../account-deletion.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('AccountDeletionSaga', () => {
    const mockEmailService = {};
    const mockNotificationClient = {
        sendPushNotification: jest.fn().mockResolvedValue(undefined)
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeAccountDeletionSaga', () => {
        const event = {
            eventId: 'evt-1',
            aggregateId: 'user-1',
            userId: 'user-1',
            reason: 'User requested',
            deletedBy: 'user-1',
            timestamp: new Date(),
            metadata: { correlationId: 'corr-1' }
        };

        test('starts orchestration with correct payload', async () => {
            const startSpy = jest.spyOn(AccountDeletionSaga.prototype, 'start').mockResolvedValue('saga-1');

            await executeAccountDeletionSaga(event as any, mockEmailService as any, mockNotificationClient as any);

            expect(startSpy).toHaveBeenCalledWith(
                event,
                'corr-1'
            );
        });

        test('handles saga start failure', async () => {
            jest.spyOn(AccountDeletionSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

            await expect(executeAccountDeletionSaga(event as any, mockEmailService as any, mockNotificationClient as any))
                .rejects.toThrow('Fail');

            expect(logger.error).toHaveBeenCalled();
        });
    });
});
