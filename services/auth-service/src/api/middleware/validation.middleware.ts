import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation middleware for request data
 */

interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  value?: any;
}

interface ValidationOptions {
  allowUnknown?: boolean;
}

/**
 * Validate request data against schema
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const bodyResult = validateData(req.body, schema.body);
      if (!bodyResult.isValid) {
        errors.push(...(bodyResult.errors || []));
      } else {
        req.body = bodyResult.value;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const queryResult = validateData(req.query, schema.query);
      if (!queryResult.isValid) {
        errors.push(...(queryResult.errors || []));
      } else {
        req.query = queryResult.value;
      }
    }

    // Validate route parameters
    if (schema.params) {
      const paramsResult = validateData(req.params, schema.params);
      if (!paramsResult.isValid) {
        errors.push(...(paramsResult.errors || []));
      } else {
        req.params = paramsResult.value;
      }
    }

    // Validate headers
    if (schema.headers) {
      const headersResult = validateData(req.headers, schema.headers, { allowUnknown: true });
      if (!headersResult.isValid) {
        errors.push(...(headersResult.errors || []));
      } else {
        req.headers = headersResult.value;
      }
    }

    if (errors.length > 0) {
      const hasAuthHeaderRule =
        schema.headers && Object.prototype.hasOwnProperty.call(schema.headers, 'authorization');
      const isAuthError = Boolean(
        hasAuthHeaderRule && errors.some((err) => /authorization/i.test(err))
      );

      res.status(isAuthError ? 401 : 400).json({
        success: false,
        message: isAuthError ? 'Authentication required' : 'Validation failed',
        errors
      });
      return;
    }

    next();
  };
}

/**
 * Validate data against Joi schema
 */
function validateData(data: any, schema: any, options: ValidationOptions = {}): ValidationResult {
  try {
    // Convert custom schema to Joi schema
    const joiSchema = convertToJoiSchema(schema, options);
    const { error, value } = joiSchema.validate(data, {
      abortEarly: false,
      allowUnknown: options.allowUnknown ?? false
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return { isValid: false, errors };
    }

    return { isValid: true, value };
  } catch (err) {
    return {
      isValid: false,
      errors: ['Invalid validation schema']
    };
  }
}

/**
 * Convert custom validation schema to Joi schema
 */
function convertToJoiSchema(schema: any, options: ValidationOptions = {}): Joi.ObjectSchema {
  const joiSchema: any = {};

  for (const [field, rules] of Object.entries(schema)) {
    if (typeof rules === 'object' && rules !== null) {
      joiSchema[field] = convertRuleToJoiSchema(rules as any);
    }
  }

  return Joi.object(joiSchema).unknown(options.allowUnknown ?? false);
}

function convertRuleToJoiSchema(ruleObj: any): Joi.Schema {
  let fieldSchema: Joi.Schema;

  switch (ruleObj.type) {
    case 'string':
      fieldSchema = Joi.string();
      break;
    case 'number':
      fieldSchema = Joi.number();
      if (ruleObj.integer) {
        fieldSchema = (fieldSchema as Joi.NumberSchema).integer();
      }
      break;
    case 'boolean':
      fieldSchema = Joi.boolean();
      break;
    case 'object': {
      const nestedProperties = ruleObj.properties && typeof ruleObj.properties === 'object'
        ? Object.entries(ruleObj.properties).reduce<Record<string, Joi.Schema>>((acc, [key, value]) => {
            acc[key] = convertRuleToJoiSchema(value);
            return acc;
          }, {})
        : undefined;
      fieldSchema = nestedProperties
        ? Joi.object(nestedProperties).unknown(ruleObj.additionalProperties === true || ruleObj.allowUnknown === true)
        : Joi.object().unknown(ruleObj.additionalProperties === true || ruleObj.allowUnknown === true);
      break;
    }
    case 'array':
      fieldSchema = Joi.array();
      if (ruleObj.items) {
        fieldSchema = (fieldSchema as Joi.ArraySchema).items(convertRuleToJoiSchema(ruleObj.items));
      }
      if (ruleObj.minItems !== undefined) {
        fieldSchema = (fieldSchema as Joi.ArraySchema).min(ruleObj.minItems);
      }
      if (ruleObj.maxItems !== undefined) {
        fieldSchema = (fieldSchema as Joi.ArraySchema).max(ruleObj.maxItems);
      }
      break;
    default:
      fieldSchema = Joi.any();
  }

  if (ruleObj.minLength !== undefined && 'min' in fieldSchema) {
    fieldSchema = (fieldSchema as any).min(ruleObj.minLength);
  }

  if (ruleObj.maxLength !== undefined && 'max' in fieldSchema) {
    fieldSchema = (fieldSchema as any).max(ruleObj.maxLength);
  }

  if (ruleObj.min !== undefined && 'min' in fieldSchema) {
    fieldSchema = (fieldSchema as any).min(ruleObj.min);
  }

  if (ruleObj.max !== undefined && 'max' in fieldSchema) {
    fieldSchema = (fieldSchema as any).max(ruleObj.max);
  }

  if (ruleObj.pattern && ruleObj.type === 'string') {
    fieldSchema = (fieldSchema as Joi.StringSchema).pattern(
      ruleObj.pattern instanceof RegExp ? ruleObj.pattern : new RegExp(ruleObj.pattern)
    );
  }

  if (ruleObj.format === 'email' && ruleObj.type === 'string') {
    fieldSchema = (fieldSchema as Joi.StringSchema).email();
  }

  if ((ruleObj.format === 'date' || ruleObj.format === 'date-time') && ruleObj.type === 'string') {
    fieldSchema = (fieldSchema as Joi.StringSchema).isoDate();
  }

  if (ruleObj.format === 'uri' && ruleObj.type === 'string') {
    fieldSchema = (fieldSchema as Joi.StringSchema).uri();
  }

  if (ruleObj.format === 'ipv4' && ruleObj.type === 'string') {
    fieldSchema = (fieldSchema as Joi.StringSchema).ip({ version: ['ipv4'] });
  }

  if (Array.isArray(ruleObj.enum)) {
    fieldSchema = (fieldSchema as any).valid(...ruleObj.enum);
  }

  if (ruleObj.default !== undefined) {
    fieldSchema = (fieldSchema as any).default(ruleObj.default);
  }

  if (ruleObj.required) {
    return (fieldSchema as any).required();
  }

  return (fieldSchema as any).optional();
}
