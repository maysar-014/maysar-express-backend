import crypto from 'crypto';
import { MatchLevel, MatchResult } from '../value-objects/match-result.value-object';
import {
  NewProductCreatedEvent,
  ProductMatchConfirmationRequiredEvent,
  ProductMatchConfirmedEvent,
  ProductMatchFoundEvent,
  ProductMatchRejectedEvent
} from './matching-events';

describe('matching events', () => {
  beforeEach(() => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const candidate = {
    name: 'Sample Product',
    brand: 'BrandX',
    model: 'ModelY',
    categoryId: 'cat-1'
  } as any;

  const result = new MatchResult({
    level: MatchLevel.STRONG,
    score: 0.9,
    matchedProductId: 'prod-1',
    criteria: { brandMatch: true },
    requiresConfirmation: true
  });

  it('creates found/confirmation-required events', () => {
    const found = new ProductMatchFoundEvent('seller-1', candidate, result);
    const required = new ProductMatchConfirmationRequiredEvent('seller-1', candidate, result, 'conf-1');

    expect(found.eventType).toBe('ProductMatchFound');
    expect(found.eventId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(required.eventType).toBe('ProductMatchConfirmationRequired');
    expect(required.confirmationId).toBe('conf-1');
    expect(required.occurredAt).toBeInstanceOf(Date);
  });

  it('creates confirmed/rejected/new-product events', () => {
    const confirmed = new ProductMatchConfirmedEvent('seller-1', 'conf-1', 'audit-1', 'prod-1');
    const rejected = new ProductMatchRejectedEvent('seller-1', 'conf-1', 'audit-1');
    const created = new NewProductCreatedEvent('prod-new', 'seller-1', MatchResult.noMatch());

    expect(confirmed.eventType).toBe('ProductMatchConfirmed');
    expect(confirmed.confirmedProductId).toBe('prod-1');
    expect(rejected.eventType).toBe('ProductMatchRejected');
    expect(created.eventType).toBe('NewProductCreated');
    expect(created.matchResult.isNoMatch()).toBe(true);
  });
});
