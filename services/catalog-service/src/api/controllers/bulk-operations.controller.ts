/**
 * Bulk Operations Controller
 * API layer controller for bulk product operations
 */

import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId?: string;
    operationId?: string;
  };
}

export class BulkOperationsController {
  async bulkCreateProducts(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk product creation is not implemented.');
  }

  async bulkUpdateProducts(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk product updates are not implemented.');
  }

  async bulkDeleteProducts(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk product deletion is not implemented.');
  }

  /**
   * POST /v1/products/:id/unpublish is implemented on the product controller;
   * the bulk variants below have no persistence layer behind them yet. They
   * must never report a fabricated success — clients rely on these codes to
   * decide whether a batch actually ran.
   */
  async bulkPublishProducts(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk product publishing is not implemented.');
  }

  async bulkUnpublishProducts(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk product unpublishing is not implemented.');
  }

  async bulkUpdateCategories(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk category updates are not implemented.');
  }

  async getBulkOperationStatus(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk operation status is not implemented.');
  }

  async getBulkOperationsHistory(_req: Request, res: Response): Promise<void> {
    this.sendNotImplemented(res, 'Bulk operations history is not implemented.');
  }

  private sendNotImplemented(res: Response, message: string): void {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message
      },
      meta: { timestamp: new Date() }
    });
  }
}
