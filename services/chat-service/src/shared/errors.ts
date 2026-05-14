export class ChatError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ChatError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const chatAccessDenied = (): ChatError =>
  new ChatError('Access denied to this conversation', 'CHAT_ACCESS_DENIED', 403);

export const chatRecipientBlocked = (): ChatError =>
  new ChatError('Recipient has been blocked', 'CHAT_RECIPIENT_BLOCKED', 403);

export const chatOrderAccessDenied = (): ChatError =>
  new ChatError('Access denied to this order', 'CHAT_ORDER_ACCESS_DENIED', 403);

export const chatConversationArchived = (): ChatError =>
  new ChatError('This conversation has been archived', 'CHAT_CONVERSATION_ARCHIVED', 403);

export const chatRateLimitExceeded = (): ChatError =>
  new ChatError('Conversation rate limit exceeded', 'CHAT_RATE_LIMIT_EXCEEDED', 429);

export const chatMessageRateLimitExceeded = (): ChatError =>
  new ChatError('Message rate limit exceeded', 'CHAT_MESSAGE_RATE_LIMIT_EXCEEDED', 429);

export const chatInvalidProductReference = (): ChatError =>
  new ChatError('Invalid product reference', 'CHAT_INVALID_PRODUCT_REFERENCE', 422);

export const chatValidationError = (message: string): ChatError =>
  new ChatError(message, 'VALIDATION_ERROR', 422);

export const chatNotFound = (resource: string): ChatError =>
  new ChatError(`${resource} not found`, 'CHAT_NOT_FOUND', 404);
