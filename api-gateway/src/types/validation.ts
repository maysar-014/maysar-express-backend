/**
 * Validation Type Definitions
 * 
 * Type definitions for request validation, schema validation, and data validation
 */

// Validation Schema Types
export interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  files?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data: any;
}

export interface ValidationError {
  field: string;
  value: any;
  constraint: string;
  message: string;
  path: string[];
}

// ValidationError class for use in middleware
export class ValidationErrorClass extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Request Validation Types
export interface RequestValidator {
  validateBody: (data: any) => ValidationResult;
  validateQuery: (data: any) => ValidationResult;
  validateParams: (data: any) => ValidationResult;
  validateHeaders: (data: any) => ValidationResult;
  validateFiles: (data: any) => ValidationResult;
}

// Schema Definition Types
export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'date';
  properties?: Record<string, SchemaField>;
  items?: SchemaField;
  required?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: any[];
  format?: 'email' | 'url' | 'date' | 'date-time' | 'uuid';
  nullable?: boolean;
  default?: any;
}

export interface SchemaField extends SchemaDefinition {
  name: string;
  description?: string;
  example?: any;
  deprecated?: boolean;
}

// Custom Validation Types
export interface CustomValidator {
  name: string;
  validate: (value: any, context?: any) => boolean | Promise<boolean>;
  message: string;
  params?: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  validators: CustomValidator[];
  required: boolean;
  type: string;
  options?: Record<string, any>;
}

// OpenAPI Validation Types
export interface OpenAPIValidationConfig {
  schemas: Record<string, SchemaDefinition>;
  components: {
    schemas: Record<string, any>;
    parameters: Record<string, any>;
    requestBodies: Record<string, any>;
    responses: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  paths: Record<string, any>;
}

// Validation Context Types
export interface ValidationContext {
  request: any;
  response: any;
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
  headers: Record<string, any>;
  files?: any[];
  user?: any;
  session?: any;
}

// Error Response Types
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: 'Request validation failed';
    details: ValidationError[];
  };
  timestamp: string;
  requestId: string;
}

// Validation Middleware Types
export interface RequestValidationMiddleware {
  (req: any, res: any, next: any): void;
  schema: ValidationSchema;
  strict: boolean;
}

// Schema Registry Types
export interface SchemaRegistry {
  register: (name: string, schema: SchemaDefinition) => void;
  get: (name: string) => SchemaDefinition | undefined;
  validate: (name: string, data: any) => ValidationResult;
  list: () => string[];
}

// Field Validation Types
export interface FieldValidator {
  field: string;
  rules: ValidationRule[];
  transform?: (value: any) => any;
  sanitize?: (value: any) => any;
}

// Batch Validation Types
export interface BatchValidationRequest {
  items: any[];
  schema: SchemaDefinition;
  options?: {
    stopOnFirstError: boolean;
    parallel: boolean;
    batchSize: number;
  };
}

export interface BatchValidationResult {
  success: boolean;
  results: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: number;
  };
}

// Export all validation types
export * from './validation';