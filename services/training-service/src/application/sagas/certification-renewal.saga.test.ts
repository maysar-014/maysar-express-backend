import { CertificationRenewalSaga } from './certification-renewal.saga';

describe('CertificationRenewalSaga', () => {
  it('is constructible as an orchestration placeholder', () => {
    const saga = new CertificationRenewalSaga();

    expect(saga).toBeInstanceOf(CertificationRenewalSaga);
  });
});
