import { BusinessRegistrationSaga, executeBusinessRegistrationSaga } from '../business-registration.saga';
import { BusinessRegisteredEvent } from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';

describe('BusinessRegistrationSaga', () => {
  const createEvent = () =>
    new BusinessRegisteredEvent('biz-1', 'owner-1', BusinessType.SOLE_PROPRIETORSHIP, 'TZ-DAR-12345');

  it('should execute all steps successfully', async () => {
    const event = createEvent();
    const saga = new BusinessRegistrationSaga(event);

    await expect(saga.execute()).resolves.not.toThrow();
  });

  it('should complete saga execution', async () => {
    const event = createEvent();
    await expect(executeBusinessRegistrationSaga(event)).resolves.not.toThrow();
  });
});
