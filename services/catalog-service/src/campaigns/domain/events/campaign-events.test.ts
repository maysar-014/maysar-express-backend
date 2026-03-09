import {
  CampaignCancelledEvent,
  CampaignCompletedEvent,
  CampaignCreatedEvent,
  CampaignLaunchedEvent,
  CampaignPausedEvent,
  CampaignResumedEvent,
  CampaignScheduledEvent
} from './campaign-events';
import { CampaignType } from '../types/campaign.types';

describe('campaign-events', () => {
  const occurredAt = new Date('2026-03-08T09:00:00.000Z');

  it('creates campaign lifecycle events with stable event type values', () => {
    const created = new CampaignCreatedEvent(
      'evt-camp-1',
      'camp-1',
      'Spring Promo',
      CampaignType.PROMOTION,
      'seller-1',
      occurredAt
    );
    const scheduled = new CampaignScheduledEvent(
      'evt-camp-2',
      'camp-1',
      new Date('2026-03-10T00:00:00.000Z'),
      new Date('2026-03-20T00:00:00.000Z'),
      occurredAt
    );
    const launched = new CampaignLaunchedEvent('evt-camp-3', 'camp-1', occurredAt);
    const paused = new CampaignPausedEvent('evt-camp-4', 'camp-1', occurredAt);
    const resumed = new CampaignResumedEvent('evt-camp-5', 'camp-1', occurredAt);
    const completed = new CampaignCompletedEvent('evt-camp-6', 'camp-1', occurredAt);
    const cancelled = new CampaignCancelledEvent('evt-camp-7', 'camp-1', 'policy change', occurredAt);

    expect(created.eventType).toBe('CampaignCreated');
    expect(created.type).toBe(CampaignType.PROMOTION);
    expect(scheduled.eventType).toBe('CampaignScheduled');
    expect(launched.eventType).toBe('CampaignLaunched');
    expect(paused.eventType).toBe('CampaignPaused');
    expect(resumed.eventType).toBe('CampaignResumed');
    expect(completed.eventType).toBe('CampaignCompleted');
    expect(cancelled.eventType).toBe('CampaignCancelled');
    expect(cancelled.reason).toBe('policy change');
  });
});
