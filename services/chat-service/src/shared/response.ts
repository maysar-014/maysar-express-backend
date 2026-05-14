import type { Response } from 'express';
import { ChatError } from './errors';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): void => {
  const body: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
};

export const sendError = (res: Response, error: ChatError): void => {
  const body: ApiResponse<never> = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
  res.status(error.statusCode).json(body);
};
