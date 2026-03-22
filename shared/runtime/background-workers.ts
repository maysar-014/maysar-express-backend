const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const readFlag = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return !FALSE_VALUES.has(value.trim().toLowerCase());
};

export const areBackgroundWorkersEnabled = (): boolean =>
  readFlag(process.env.ENABLE_BACKGROUND_WORKERS, true);

export const isSagaRecoveryEnabled = (): boolean =>
  readFlag(process.env.ENABLE_SAGA_RECOVERY, areBackgroundWorkersEnabled());

export const isOutboxProcessorEnabled = (): boolean =>
  readFlag(process.env.ENABLE_OUTBOX_PROCESSOR, areBackgroundWorkersEnabled());
