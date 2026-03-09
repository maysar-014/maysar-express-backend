import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { CancelCampaignUseCase } from './cancel-campaign.use-case';

describe('CancelCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cancels and saves the campaign when found', async () => {
    const campaign = { cancel: jest.fn() };
    const dto = { id: 'camp-1', status: 'CANCELLED' };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new CancelCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.cancel).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new CancelCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
