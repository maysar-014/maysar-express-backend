/**
 * Validation Middleware
 * 
 * Handles request validation for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationErrorClass } from '../types';

export interface ValidationOptions {
  schema?: any;
  strict?: boolean;
  validateQuery?: boolean;
  validateBody?: boolean;
  validateParams?: boolean;
  customValidators?: Record<string, (value: any, req: Request) => boolean | string>;
}

export class ValidationMiddleware {
  private options: ValidationOptions;

  constructor(options?: Partial<ValidationOptions>) {
    this.options = {
      strict: true,
      validateQuery: true,
      validateBody: true,
      validateParams: true,
      customValidators: {},
      ...options,
    };
  }

  middleware(schema?: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      const opts = {
        ...this.options,
        schema: schema || this.options.schema,
      };

      try {
        // Validate query parameters
        if (opts.validateQuery && req.query) {
          this.validateQuery(req.query, opts);
        }

        // Validate request body
        if (opts.validateBody && req.body) {
          this.validateBody(req.body, opts);
        }

        // Validate route parameters
        if (opts.validateParams && req.params) {
          this.validateParams(req.params, opts);
        }

        next();
      } catch (error) {
        if (error instanceof ValidationErrorClass) {
          return this.sendValidationError(res, error);
        }
        next(error);
      }
    };
  }

  private validateQuery(query: any, options: ValidationOptions): void {
    if (!options.schema || !options.schema.query) {
      return;
    }

    const errors: string[] = [];
    
    // Check required fields
    if (options.schema.query.required) {
      for (const field of options.schema.query.required) {
        if (!(field in query)) {
          errors.push(`Query parameter '${field}' is required`);
        }
      }
    }

    // Validate field types and constraints
    if (options.schema.query.properties) {
      for (const [field, constraints] of Object.entries(options.schema.query.properties)) {
        if (field in query) {
          const value = query[field];
          const fieldErrors = this.validateField(field, value, constraints as any);
          errors.push(...fieldErrors);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationErrorClass(
        'Query validation failed',
        400,
        { field: 'query', errors }
      );
    }
  }

  private validateBody(body: any, options: ValidationOptions): void {
    if (!options.schema || !options.schema.body) {
      return;
    }

    const errors: string[] = [];
    
    // Check required fields
    if (options.schema.body.required) {
      for (const field of options.schema.body.required) {
        if (!(field in body)) {
          errors.push(`Body field '${field}' is required`);
        }
      }
    }

    // Validate field types and constraints
    if (options.schema.body.properties) {
      for (const [field, constraints] of Object.entries(options.schema.body.properties)) {
        if (field in body) {
          const value = body[field];
          const fieldErrors = this.validateField(field, value, constraints as any);
          errors.push(...fieldErrors);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationErrorClass(
        'Body validation failed',
        400,
        { field: 'body', errors }
      );
    }
  }

  private validateParams(params: any, options: ValidationOptions): void {
    if (!options.schema || !options.schema.params) {
      return;
    }

    const errors: string[] = [];
    
    // Check required fields
    if (options.schema.params.required) {
      for (const field of options.schema.params.required) {
        if (!(field in params)) {
          errors.push(`Parameter '${field}' is required`);
        }
      }
    }

    // Validate field types and constraints
    if (options.schema.params.properties) {
      for (const [field, constraints] of Object.entries(options.schema.params.properties)) {
        if (field in params) {
          const value = params[field];
          const fieldErrors = this.validateField(field, value, constraints as any);
          errors.push(...fieldErrors);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationErrorClass(
        'Parameter validation failed',
        400,
        { field: 'params', errors }
      );
    }
  }

  private validateField(fieldName: string, value: any, constraints: any): string[] {
    const errors: string[] = [];

    // Type validation
    if (constraints.type) {
      const typeErrors = this.validateType(fieldName, value, constraints.type);
      errors.push(...typeErrors);
    }

    // Required validation
    if (constraints.required && (value === undefined || value === null)) {
      errors.push(`Field '${fieldName}' is required`);
    }

    // String validation
    if (typeof value === 'string') {
      if (constraints.minLength && value.length < constraints.minLength) {
        errors.push(`Field '${fieldName}' must be at least ${constraints.minLength} characters long`);
      }
      if (constraints.maxLength && value.length > constraints.maxLength) {
        errors.push(`Field '${fieldName}' must be at most ${constraints.maxLength} characters long`);
      }
      if (constraints.pattern && !constraints.pattern.test(value)) {
        errors.push(`Field '${fieldName}' does not match required pattern`);
      }
      if (constraints.enum && !constraints.enum.includes(value)) {
        errors.push(`Field '${fieldName}' must be one of: ${constraints.enum.join(', ')}`);
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (constraints.minimum !== undefined && value < constraints.minimum) {
        errors.push(`Field '${fieldName}' must be at least ${constraints.minimum}`);
      }
      if (constraints.maximum !== undefined && value > constraints.maximum) {
        errors.push(`Field '${fieldName}' must be at most ${constraints.maximum}`);
      }
      if (constraints.enum && !constraints.enum.includes(value)) {
        errors.push(`Field '${fieldName}' must be one of: ${constraints.enum.join(', ')}`);
      }
    }

    // Array validation
    if (Array.isArray(value)) {
      if (constraints.minItems && value.length < constraints.minItems) {
        errors.push(`Field '${fieldName}' must contain at least ${constraints.minItems} items`);
      }
      if (constraints.maxItems && value.length > constraints.maxItems) {
        errors.push(`Field '${fieldName}' must contain at most ${constraints.maxItems} items`);
      }
    }

    // Object validation
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (constraints.minProperties && Object.keys(value).length < constraints.minProperties) {
        errors.push(`Field '${fieldName}' must contain at least ${constraints.minProperties} properties`);
      }
      if (constraints.maxProperties && Object.keys(value).length > constraints.maxProperties) {
        errors.push(`Field '${fieldName}' must contain at most ${constraints.maxProperties} properties`);
      }
    }

    // Custom validation
    if (constraints.custom && this.options.customValidators[constraints.custom]) {
      const customValidator = this.options.customValidators[constraints.custom];
      const result = customValidator(value, constraints);
      if (typeof result === 'string') {
        errors.push(result);
      } else if (result === false) {
        errors.push(`Field '${fieldName}' failed custom validation`);
      }
    }

    return errors;
  }

  private validateType(fieldName: string, value: any, expectedType: string): string[] {
    const errors: string[] = [];

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field '${fieldName}' must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Field '${fieldName}' must be a number`);
        }
        break;
      case 'integer':
        if (!Number.isInteger(value)) {
          errors.push(`Field '${fieldName}' must be an integer`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field '${fieldName}' must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field '${fieldName}' must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Field '${fieldName}' must be an object`);
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          errors.push(`Field '${fieldName}' must be a valid email address`);
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`Field '${fieldName}' must be a valid URL`);
        }
        break;
      case 'date':
        if (isNaN(new Date(value).getTime())) {
          errors.push(`Field '${fieldName}' must be a valid date`);
        }
        break;
    }

    return errors;
  }

  private sendValidationError(res: Response, error: ValidationErrorClass): void {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
      requestId: (res as any).requestId || 'unknown',
    });
  }

  // Utility method to create validation schema
  static createSchema(schema: any): any {
    return schema;
  }

  // Utility method to add custom validator
  addCustomValidator(name: string, validator: (value: any, req: Request) => boolean | string): void {
    this.options.customValidators![name] = validator;
  }
}

// Default validation middleware instance
export const validationMiddleware = new ValidationMiddleware();

// Export middleware function
export const validate = validationMiddleware.middleware();