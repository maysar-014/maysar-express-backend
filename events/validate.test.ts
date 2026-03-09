import * as fs from 'fs';
import { EventSchemaValidator } from './validate';

describe('EventSchemaValidator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails fast when catalog file is missing', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const validator = new EventSchemaValidator();
    const result = await validator.validate();

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Event catalog (CATALOG.md) not found');
  });

  it('runs validation pipeline when catalog exists', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const validator = new EventSchemaValidator() as any;
    validator.validateSchemaRegistry = jest.fn();
    validator.validateEventTypes = jest.fn();
    validator.checkBreakingChanges = jest.fn();
    validator.validateContracts = jest.fn();
    validator.printResults = jest.fn();

    const result = await validator.validate();

    expect(result.success).toBe(true);
    expect(validator.validateSchemaRegistry).toHaveBeenCalledTimes(1);
    expect(validator.validateEventTypes).toHaveBeenCalledTimes(1);
    expect(validator.checkBreakingChanges).toHaveBeenCalledTimes(1);
    expect(validator.validateContracts).toHaveBeenCalledTimes(1);
    expect(validator.printResults).toHaveBeenCalledTimes(1);
  });
});
