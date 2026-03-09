import { CampaignMetadata } from './campaign-metadata.value-object';

describe('CampaignMetadata', () => {
  it('reads values and returns defaults for unknown keys', () => {
    const metadata = CampaignMetadata.create({
      region: 'TZ',
      budget: 100000
    });

    expect(metadata.get<string>('region')).toBe('TZ');
    expect(metadata.get<number>('budget')).toBe(100000);
    expect(metadata.get<string>('missing', 'default')).toBe('default');
  });

  it('returns a defensive copy through getAll', () => {
    const metadata = CampaignMetadata.create({ tag: 'seasonal' });
    const raw = metadata.getAll();

    raw.tag = 'changed';

    expect(metadata.get<string>('tag')).toBe('seasonal');
  });
});
