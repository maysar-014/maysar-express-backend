/**
 * RequestMessage Entity (Phase 1 §1.2)
 *
 * Append-only conversation message attached to a Request. AuthorType is
 * constrained so a customer can never post as a Maysar provider, etc.
 */

import { makeId } from '../../../../../shared/ids/id';
import { RequestAuthorType } from './request.entity';

export interface RequestMessageData {
  id: string;
  requestId: string;
  authorType: RequestAuthorType;
  authorId: string | null;
  body: string;
  attachments: string[] | null;
  createdAt: Date;
}

export function makeRequestMessageId(): string {
  return makeId('RMS');
}

export class RequestMessage {
  private data: RequestMessageData;

  constructor(data: RequestMessageData) {
    if (!data.requestId) throw new Error('RequestMessage invariant violation: requestId is required');
    if (!['CUSTOMER', 'MAYSAR_PROVIDER', 'SYSTEM', 'STATUS', 'QUOTE', 'ORDER'].includes(data.authorType)) {
      throw new Error(`RequestMessage invariant violation: unknown authorType ${data.authorType}`);
    }
    if ((data.authorType === 'CUSTOMER' || data.authorType === 'MAYSAR_PROVIDER') && !data.authorId) {
      throw new Error(`RequestMessage invariant violation: ${data.authorType} message requires authorId`);
    }
    if (!data.body || data.body.trim() === '') throw new Error('RequestMessage invariant violation: body must be non-blank');
    this.data = { ...data };
  }

  static create(params: {
    requestId: string;
    authorType: RequestAuthorType;
    authorId?: string | null;
    body: string;
    attachments?: string[] | null;
  }): RequestMessage {
    return new RequestMessage({
      id: makeRequestMessageId(),
      requestId: params.requestId,
      authorType: params.authorType,
      authorId: params.authorId ?? null,
      body: params.body,
      attachments: params.attachments ?? null,
      createdAt: new Date(),
    });
  }

  get id() { return this.data.id; }
  get requestId() { return this.data.requestId; }
  get authorType() { return this.data.authorType; }
  get authorId() { return this.data.authorId; }
  get body() { return this.data.body; }
  get attachments() { return this.data.attachments; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestMessageData {
    return { ...this.data };
  }
}