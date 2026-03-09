import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { GetCampaignUseCase } from './get-campaign.use-case';
import { CampaignMapper } from '../mappers/campaign.mapper';

describe('GetCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns mapped dto when campaign exists', async () => {
    const campaign = { id: 'camp-1' };
    const dto = { id: 'camp-1', name: 'Campaign 1' };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign)
    };
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new GetCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null)
    };
    const useCase = new GetCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
  });
});
