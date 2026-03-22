import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

type ValidationSections = {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
  headers?: Joi.Schema;
};

type SectionName = keyof ValidationSections;

const normalizeBody = (body: unknown): unknown => {
  if (body === undefined || body === null) {
    return undefined;
  }

  return body;
};

const formatValidationDetails = (error: Joi.ValidationError) =>
  error.details.map((detail) => ({
    field: detail.path.length ? detail.path.join('.') : 'value',
    message: detail.message,
  }));

const validateSection = (
  section: SectionName,
  schema: Joi.Schema,
  req: Request
): { error?: Joi.ValidationError; value?: unknown } => {
  const source =
    section === 'body'
      ? normalizeBody(req.body)
      : req[section];

  const { error, value } = schema.validate(source, {
    abortEarly: false,
    allowUnknown: section === 'headers',
    stripUnknown: false,
    convert: true,
  });

  return { error, value };
};

export const validateJoiRequest = (schemas: ValidationSections) =>
  (req: Request, res: Response, next: NextFunction): void => {
    for (const section of ['params', 'query', 'body', 'headers'] as SectionName[]) {
      const schema = schemas[section];
      if (!schema) continue;

      const { error, value } = validateSection(section, schema, req);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: formatValidationDetails(error),
          },
        });
        return;
      }

      if (value !== undefined && section !== 'headers') {
        req[section] = value as never;
      }
    }

    next();
  };

