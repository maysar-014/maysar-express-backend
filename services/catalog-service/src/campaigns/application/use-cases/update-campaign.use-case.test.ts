import { CampaignNotFoundError, CampaignValidationError } from '../../domain/errors/campaign.errors';
import { CampaignStatus } from '../../domain/types/campaign.types';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { UpdateCampaignUseCase } from './update-campaign.use-case';

describe('UpdateCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves and maps campaign when status is DRAFT', async () => {
    const campaign = {
      getStatus: jest.fn().mockReturnValue(CampaignStatus.DRAFT)
    };
    const dto = { id: 'camp-1', status: CampaignStatus.DRAFT };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new UpdateCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1', { name: 'Updated' });

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.getStatus).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new UpdateCampaignUseCase(repository as never);

    await expect(useCase.execute('missing', {})).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws CampaignValidationError when campaign is not DRAFT', async () => {
    const campaign = {
      getStatus: jest.fn().mockReturnValue(CampaignStatus.ACTIVE)
    };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn()
    };
    const useCase = new UpdateCampaignUseCase(repository as never);

    await expect(useCase.execute('camp-1', { name: 'Updated' })).rejects.toBeInstanceOf(CampaignValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
