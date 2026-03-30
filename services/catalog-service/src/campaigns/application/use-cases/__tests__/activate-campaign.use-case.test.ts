import { CampaignMapper } from '../../mappers/campaign.mapper';
import { CampaignNotFoundError, CampaignValidationError } from '../../../domain/errors/campaign.errors';
import { CampaignStatus } from '../../../domain/types/campaign.types';
import { CampaignValidationPolicy } from '../../../domain/policies/campaign-validation.policy';
import { ActivateCampaignUseCase } from '../activate-campaign.use-case';
import { LaunchCampaignUseCase } from '../launch-campaign.use-case';
import { ResumeCampaignUseCase } from '../resume-campaign.use-case';
import { CompleteCampaignUseCase } from '../complete-campaign.use-case';
import { UpdateCampaignUseCase } from '../update-campaign.use-case';
import { GetCampaignUseCase } from '../get-campaign.use-case';
import { ListCampaignsUseCase } from '../list-campaigns.use-case';
import { ScheduleCampaignUseCase } from '../schedule-campaign.use-case';

type CampaignRepositoryMock = {
  findById: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  findAll: jest.Mock;
  findBySellerId: jest.Mock;
  update: jest.Mock;
};

type LifecycleCampaignMock = {
  status: CampaignStatus;
  getStatus: jest.Mock;
  launch: jest.Mock;
  resume: jest.Mock;
  complete: jest.Mock;
  schedule_campaign: jest.Mock;
};

function createRepository(): CampaignRepositoryMock {
  return {
    findById: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
    findBySellerId: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function createLifecycleCampaign(initialStatus: CampaignStatus = CampaignStatus.DRAFT): LifecycleCampaignMock {
  let status = initialStatus;

  return {
    get status() {
      return status;
    },
    set status(nextStatus: CampaignStatus) {
      status = nextStatus;
    },
    getStatus: jest.fn(() => status),
    launch: jest.fn(() => {
      status = CampaignStatus.ACTIVE;
    }),
    resume: jest.fn(() => {
      status = CampaignStatus.ACTIVE;
    }),
    complete: jest.fn(() => {
      status = CampaignStatus.COMPLETED;
    }),
    schedule_campaign: jest.fn(() => {
      status = CampaignStatus.SCHEDULED;
    }),
  };
}

describe('ActivateCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('activates, persists, and publishes the campaign', async () => {
    const campaign = { id: 'camp-1', status: CampaignStatus.DRAFT };
    const repository = createRepository();
    const eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    repository.findById.mockResolvedValue(campaign);

    const useCase = new ActivateCampaignUseCase(repository as never, eventBus as never);
    const result = await useCase.execute({ campaignId: 'camp-1' });

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(repository.update).toHaveBeenCalledWith(campaign);
    expect(eventBus.publish).toHaveBeenCalledWith('CampaignActivated.v1', campaign);
    expect(campaign.status).toBe(CampaignStatus.ACTIVE);
    expect(result).toBe(campaign);
  });

  it('throws when the campaign does not exist', async () => {
    const repository = createRepository();
    const eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    repository.findById.mockResolvedValue(null);

    const useCase = new ActivateCampaignUseCase(repository as never, eventBus as never);

    await expect(useCase.execute({ campaignId: 'missing' })).rejects.toThrow('Campaign not found');
    expect(repository.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

describe('LaunchCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('validates, launches, saves, and maps the campaign', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.DRAFT);
    const repository = createRepository();
    const dto = { id: 'camp-1', status: CampaignStatus.ACTIVE };

    repository.findById.mockResolvedValue(campaign);
    const validateSpy = jest.spyOn(CampaignValidationPolicy.prototype, 'validateLaunch').mockImplementation(() => undefined);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new LaunchCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(validateSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.launch).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.status).toBe(CampaignStatus.ACTIVE);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new LaunchCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('ResumeCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resumes and saves the campaign', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.PAUSED);
    const repository = createRepository();
    const dto = { id: 'camp-1', status: CampaignStatus.ACTIVE };

    repository.findById.mockResolvedValue(campaign);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new ResumeCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.resume).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.status).toBe(CampaignStatus.ACTIVE);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new ResumeCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('CompleteCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes and saves the campaign', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.ACTIVE);
    const repository = createRepository();
    const dto = { id: 'camp-1', status: CampaignStatus.COMPLETED };

    repository.findById.mockResolvedValue(campaign);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new CompleteCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.complete).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.status).toBe(CampaignStatus.COMPLETED);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new CompleteCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('UpdateCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves and maps the campaign when it is still a draft', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.DRAFT);
    const repository = createRepository();
    const dto = { id: 'camp-1', status: CampaignStatus.DRAFT };

    repository.findById.mockResolvedValue(campaign);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new UpdateCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1', { name: 'Updated name' });

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.getStatus).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new UpdateCampaignUseCase(repository as never);

    await expect(useCase.execute('missing', { name: 'Updated name' })).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws CampaignValidationError when campaign is not a draft', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.ACTIVE);
    const repository = createRepository();

    repository.findById.mockResolvedValue(campaign);

    const useCase = new UpdateCampaignUseCase(repository as never);

    await expect(useCase.execute('camp-1', { name: 'Updated name' })).rejects.toBeInstanceOf(CampaignValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('GetCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a mapped dto when the campaign exists', async () => {
    const campaign = { id: 'camp-1' };
    const dto = { id: 'camp-1', status: CampaignStatus.DRAFT };
    const repository = createRepository();

    repository.findById.mockResolvedValue(campaign);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new GetCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when the campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new GetCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
  });
});

describe('ListCampaignsUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads campaigns from the repository and maps them to dtos', async () => {
    const campaigns = [{ id: 'c1' }, { id: 'c2' }];
    const dto1 = { id: 'c1', status: CampaignStatus.DRAFT };
    const dto2 = { id: 'c2', status: CampaignStatus.ACTIVE };
    const repository = createRepository();

    repository.findAll.mockResolvedValue(campaigns);

    let index = 0;
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockImplementation(() => {
      index += 1;
      return (index === 1 ? dto1 : dto2) as never;
    });

    const useCase = new ListCampaignsUseCase(repository as never);
    const result = await useCase.execute({ sellerId: 'seller-1' });

    expect(repository.findAll).toHaveBeenCalledWith({ sellerId: 'seller-1' });
    expect(mapperSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual([dto1, dto2]);
  });
});

describe('ScheduleCampaignUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules and saves the campaign', async () => {
    const campaign = createLifecycleCampaign(CampaignStatus.DRAFT);
    const repository = createRepository();
    const dto = { id: 'camp-1', status: CampaignStatus.SCHEDULED };

    repository.findById.mockResolvedValue(campaign);
    const mapperSpy = jest.spyOn(CampaignMapper, 'toDto').mockReturnValue(dto as never);

    const useCase = new ScheduleCampaignUseCase(repository as never);
    const result = await useCase.execute('camp-1');

    expect(repository.findById).toHaveBeenCalledWith('camp-1');
    expect(campaign.schedule_campaign).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(campaign);
    expect(mapperSpy).toHaveBeenCalledWith(campaign);
    expect(campaign.status).toBe(CampaignStatus.SCHEDULED);
    expect(result).toEqual(dto);
  });

  it('throws CampaignNotFoundError when campaign does not exist', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);

    const useCase = new ScheduleCampaignUseCase(repository as never);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CampaignNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
