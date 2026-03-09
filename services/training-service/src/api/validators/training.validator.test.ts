import { TrainingValidator } from './training.validator';

describe('TrainingValidator', () => {
  it('validates start request required fields', () => {
    const valid = TrainingValidator.validateStartRequest({
      learnerId: 'learner-8',
      learnerRole: 'courier',
      moduleId: 'module-7'
    });
    const invalid = TrainingValidator.validateStartRequest({});

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(
      expect.arrayContaining(['learnerId is required', 'learnerRole is required', 'moduleId is required'])
    );
  });

  it('validates completion score range and id param', () => {
    const completeValid = TrainingValidator.validateCompleteRequest({ score: 88 });
    const completeInvalid = TrainingValidator.validateCompleteRequest({ score: 101 });
    const idValid = TrainingValidator.validateIdParam({ id: 'abc' });
    const idInvalid = TrainingValidator.validateIdParam({}, 'moduleId');

    expect(completeValid.valid).toBe(true);
    expect(completeInvalid.valid).toBe(false);
    expect(completeInvalid.errors).toEqual(
      expect.arrayContaining(['score must be a number between 0 and 100'])
    );
    expect(idValid.valid).toBe(true);
    expect(idInvalid.errors).toEqual(expect.arrayContaining(['moduleId is required']));
  });
});
