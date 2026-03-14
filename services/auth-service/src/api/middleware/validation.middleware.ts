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
      res.status(400).json({
        success: false,
        message: 'Validation failed',
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
    const joiSchema = convertToJoiSchema(schema);
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
function convertToJoiSchema(schema: any): Joi.ObjectSchema {
  const joiSchema: any = {};

  for (const [field, rules] of Object.entries(schema)) {
    if (typeof rules === 'object' && rules !== null) {
      const ruleObj = rules as any;
      let fieldSchema: any;

      // Determine field type
      switch (ruleObj.type) {
        case 'string':
          fieldSchema = Joi.string();
          break;
        case 'number':
          fieldSchema = Joi.number();
          break;
        case 'boolean':
          fieldSchema = Joi.boolean();
          break;
        case 'object':
          fieldSchema = Joi.object();
          break;
        case 'array':
          fieldSchema = Joi.array();
          break;
        default:
          fieldSchema = Joi.any();
      }

      // Apply constraints
      if (ruleObj.required) {
        fieldSchema = fieldSchema.required();
      } else {
        fieldSchema = fieldSchema.optional();
      }

      if (ruleObj.minLength !== undefined) {
        fieldSchema = fieldSchema.min(ruleObj.minLength);
      }

      if (ruleObj.maxLength !== undefined) {
        fieldSchema = fieldSchema.max(ruleObj.maxLength);
      }

      if (ruleObj.min !== undefined) {
        fieldSchema = fieldSchema.min(ruleObj.min);
      }

      if (ruleObj.max !== undefined) {
        fieldSchema = fieldSchema.max(ruleObj.max);
      }

      if (ruleObj.pattern) {
        fieldSchema = fieldSchema.pattern(ruleObj.pattern);
      }

      if (ruleObj.format === 'email') {
        fieldSchema = fieldSchema.email();
      }

      if (ruleObj.format === 'date') {
        fieldSchema = fieldSchema.isoDate();
      }

      if (ruleObj.format === 'uri') {
        fieldSchema = fieldSchema.uri();
      }

      if (Array.isArray(ruleObj.enum)) {
        fieldSchema = fieldSchema.valid(...ruleObj.enum);
      }

      joiSchema[field] = fieldSchema;
    }
  }

  return Joi.object(joiSchema);
}
