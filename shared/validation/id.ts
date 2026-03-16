import Joi from 'joi';
import { z } from 'zod';
import { isSystemId } from '@shared/ids/id';

export const zodId = (message = 'Invalid ID format') =>
  z.string().refine(isSystemId, { message });

export const joiId = (message = 'Invalid ID format') =>
  Joi.string().custom((value, helpers) => {
    if (typeof value === 'string' && isSystemId(value)) {
      return value;
    }
    return helpers.message({ 'any.custom': message });
  });

export { isSystemId };
