import { AccountSuspensionSaga, executeAccountSuspensionSaga } from '../account-suspension.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('AccountSuspensionSaga', () => {
    const mockEmailService = {};
    const mockNotificationClient = {
        sendPushNotification: jest.fn().mockResolvedValue(undefined)
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeAccountSuspensionSaga', () => {
        const event = {
            eventId: 'evt-1',
            aggregateId: 'user-1',
            userId: 'user-1',
            reason: 'Violation',
            suspendedBy: 'admin-1',
            timestamp: new Date(),
            metadata: { correlationId: 'corr-1' }
        };

        test('starts orchestration with correct payload', async () => {
            const startSpy = jest.spyOn(AccountSuspensionSaga.prototype, 'start').mockResolvedValue('saga-1');

            await executeAccountSuspensionSaga(event as any, mockEmailService as any, mockNotificationClient as any);

            expect(startSpy).toHaveBeenCalledWith(
                event,
                'corr-1'
            );
        });

        test('handles saga start failure', async () => {
            jest.spyOn(AccountSuspensionSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

            await expect(executeAccountSuspensionSaga(event as any, mockEmailService as any, mockNotificationClient as any))
                .rejects.toThrow('Fail');

            expect(logger.error).toHaveBeenCalled();
        });
    });
});
