import { SuspiciousPhraseUseCase } from "./suspicious-phrase.use-case";

describe("SuspiciousPhraseUseCase (dynamic phrase registry management)", () => {
  const buildDeps = () => {
    const moderationRepo = {
      findSuspiciousPhraseByPhrase: jest.fn(),
      createSuspiciousPhrase: jest.fn(),
      findSuspiciousPhraseById: jest.fn(),
      listSuspiciousPhrases: jest.fn(),
      updateSuspiciousPhrase: jest.fn(),
      deleteSuspiciousPhrase: jest.fn(),
      incrementSuspiciousPhraseMatches: jest.fn(),
      countSuspiciousPhrases: jest.fn(),
    };
    const provider = {
      getPhrases: jest.fn(),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };
    const miner = {
      run: jest.fn().mockResolvedValue(12),
      promote: jest.fn(),
      dismiss: jest.fn(),
      listPending: jest.fn().mockResolvedValue([]),
    };
    return { moderationRepo, provider, miner };
  };

  it("seeds the built-in catalog (incl. Tanzanian Swahili) into the DB without overwriting", async () => {
    const deps = buildDeps();
    deps.moderationRepo.countSuspiciousPhrases.mockResolvedValue(0);
    deps.moderationRepo.findSuspiciousPhraseByPhrase.mockImplementation(
      (phrase: string) =>
        phrase === "tuma kwa m-pesa"
          ? Promise.resolve({ id: "x" })
          : Promise.resolve(null),
    );
    deps.moderationRepo.createSuspiciousPhrase.mockImplementation(
      (input: unknown) => Promise.resolve(input),
    );
    const useCase = new SuspiciousPhraseUseCase(
      deps.moderationRepo as never,
      deps.provider as never,
      deps.miner as never,
    );

    const result = await useCase.seedDefaults();

    expect(result.phrasesInserted + result.regexInserted).toBeGreaterThan(80);
    expect(result.alreadyPresent).toBe(1);
    expect(deps.provider.invalidate).toHaveBeenCalled();
  });

  it("creates admin phrases with regex validation and cache invalidation", async () => {
    const deps = buildDeps();
    deps.moderationRepo.findSuspiciousPhraseByPhrase.mockResolvedValue(null);
    deps.moderationRepo.createSuspiciousPhrase.mockImplementation(
      (input: unknown) => Promise.resolve(input),
    );
    const useCase = new SuspiciousPhraseUseCase(
      deps.moderationRepo as never,
      deps.provider as never,
      deps.miner as never,
    );

    const created = await useCase.createPhrase({
      phrase: "tuma dew ya haraka",
      category: "admin_added",
      description: "Admin-added Swahili scam phrase",
      action: "BLOCK",
      weight: 100,
    });

    expect((created as { phrase: string }).phrase).toBe("tuma dew ya haraka");
    expect(deps.moderationRepo.createSuspiciousPhrase).toHaveBeenCalledWith(
      expect.objectContaining({ source: "ADMIN", action: "BLOCK" }),
    );
    expect(deps.provider.invalidate).toHaveBeenCalled();

    await expect(
      useCase.createPhrase({
        phrase: "(valid[",
        matchType: "REGEX",
        category: "admin_added",
      }),
    ).rejects.toThrow(/invalid regular expression/);
  });

  it("rejects duplicate phrases and empty input", async () => {
    const deps = buildDeps();
    deps.moderationRepo.findSuspiciousPhraseByPhrase.mockResolvedValue({
      id: "x",
    });
    const useCase = new SuspiciousPhraseUseCase(
      deps.moderationRepo as never,
      deps.provider as never,
      deps.miner as never,
    );

    await expect(
      useCase.createPhrase({ phrase: "duplicate", category: "custom" }),
    ).rejects.toThrow(/already exists/);
    await expect(
      useCase.createPhrase({ phrase: "   ", category: "custom" }),
    ).rejects.toThrow(/must not be empty/);
  });

  it("mines, promotes and dismisses emerging patterns dynamically", async () => {
    const deps = buildDeps();
    deps.miner.promote.mockResolvedValue({
      id: "pat-1",
      phrase: "kufungua mzigo",
      status: "PROMOTED",
    });
    deps.miner.dismiss.mockResolvedValue({
      id: "pat-2",
      phrase: "false positive",
      status: "DISMISSED",
    });
    const useCase = new SuspiciousPhraseUseCase(
      deps.moderationRepo as never,
      deps.provider as never,
      deps.miner as never,
    );

    const scanned = await useCase.minePatterns({ days: 3 });
    expect(scanned).toBe(12);
    expect(deps.miner.run).toHaveBeenCalledWith({ days: 3 });

    const promoted = await useCase.promoteEmergingPattern("pat-1", {
      action: "BLOCK",
    });
    expect(promoted.status).toBe("PROMOTED");
    expect(deps.provider.invalidate).toHaveBeenCalled();

    const dismissed = await useCase.dismissEmergingPattern("pat-2");
    expect(dismissed.status).toBe("DISMISSED");
  });
});
