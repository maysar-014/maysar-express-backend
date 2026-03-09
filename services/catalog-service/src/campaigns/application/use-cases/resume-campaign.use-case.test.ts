import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { ResumeCampaignUseCase } from './resume-campaign.use-case';

describe('ResumeCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resumes and saves the campaign when found', async () => {
    const campaign = { resume: jest.fn() };
    const dto = { id: 'camp-1', status: 'ACTIVE' };
    const repository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);
    const useCase = new ResumeCampaignUseCase(repository as never);

    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.resume).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new ResumeCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
