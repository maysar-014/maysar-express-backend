import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignValidationPolicy } from '../../domain/policies/campaign-validation.policy';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { LaunchCampaignUseCase } from './launch-campaign.use-case';

describe('LaunchCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('validates, launches, and saves the campaign when found', async () => {
    const campaign = { launch: jest.fn() };
    const dto = { id: 'camp-1', status: 'ACTIVE' };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const validateSpy = jest
      .spyOn(CampaignValidationPolicy.prototype, 'validateLaunch')
      .mockImplementation(() => undefined);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new LaunchCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(validateSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.launch).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new LaunchCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
