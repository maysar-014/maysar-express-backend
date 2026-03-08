declare module 'express-validator' {
  export interface ValidationError {
    msg: string;
    param: string;
    location: string;
    value?: unknown;
  }

  export interface ValidationResult<T = ValidationError> {
    isEmpty(): boolean;
    array(options?: { onlyFirstError?: boolean }): T[];
    mapped(): Record<string, T>;
  }

  export interface ValidationChain {
    [methodName: string]: (...args: unknown[]) => ValidationChain;
  }

  export function body(...fields: string[]): ValidationChain;
  export function param(...fields: string[]): ValidationChain;
  export function query(...fields: string[]): ValidationChain;
  export function validationResult(req: unknown): ValidationResult;
}

declare module 'express-winston' {
  export interface ExpressWinstonOptions {
    transports?: unknown[];
    format?: unknown;
    level?: string;
    msg?: string;
    expressFormat?: boolean;
    colorize?: boolean;
    meta?: boolean;
    dynamicMeta?: (req: unknown, res: unknown) => Record<string, unknown>;
    [key: string]: unknown;
  }

  export function logger(
    options: ExpressWinstonOptions
  ): (req: unknown, res: unknown, next: () => void) => void;

  export function errorLogger(
    options: ExpressWinstonOptions
  ): (err: unknown, req: unknown, res: unknown, next: () => void) => void;
}
