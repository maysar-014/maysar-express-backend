// DEPRECATED: Audit middleware is now automatically initialized in EventBus singleton.
// This file is kept for backward compatibility but is no longer used.
// See shared/events/eventBus.ts for the integrated audit implementation.

export function initEventBusAuditMiddleware(): void {
    // No-op: Audit is now automatic in EventBus constructor
}
