import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { PauseCampaignUseCase } from './pause-campaign.use-case';

describe('PauseCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pauses and saves the campaign when found', async () => {
    const campaign = { pause: jest.fn() };
    const dto = { id: 'camp-1', status: 'PAUSED' };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new PauseCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.pause).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new PauseCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
