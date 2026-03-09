import { ListCampaignsUseCase } from './list-campaigns.use-case';
import { CampaignMapper } from '../mappers/campaign.mapper';

describe('ListCampaignsUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads campaigns from repository and maps them to DTOs', async () => {
    const campaigns = [{ id: 'c1' }, { id: 'c2' }];
    const dto1 = { id: 'c1', name: 'Campaign 1' };
    const dto2 = { id: 'c2', name: 'Campaign 2' };

    const repo = {
      findAll: jest.fn().mockResolvedValue(campaigns)
    };
    const mapperSpy = jest
      .spyOn(CampaignMapper, 'toDto')
      .mockImplementation((campaign: any) => (campaign.id === 'c1' ? (dto1 as never) : (dto2 as never)));

    const useCase = new ListCampaignsUseCase(repo as never);
    const result = await useCase.execute({ status: 'ACTIVE' });

    expect(repo.findAll).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(mapperSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual([dto1, dto2]);
  });
});
