import { Prisma, PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId, registerModelIds, modelSupportsId } from '../ids/id';

registerModelIds(Prisma.dmmf.datamodel.models);

const ensureId = (modelName: string, data: Record<string, unknown>): void => {
  if (!modelSupportsId(modelName)) return;
  if (data.id !== undefined && data.id !== null && data.id !== '') return;
  const prefix = getModelPrefix(modelName);
  data.id = makeId(prefix);
};

export const applyIdMiddleware = (prisma: PrismaClient): PrismaClient => {
  prisma.$use(async (params, next) => {
    const modelName = params.model;
    if (!modelName) {
      return next(params);
    }

    if (params.action === 'create' && params.args?.data) {
      ensureId(modelName, params.args.data);
    }

    if (params.action === 'createMany' && Array.isArray(params.args?.data)) {
      params.args.data.forEach((item: Record<string, unknown>) => ensureId(modelName, item));
    }

    if (params.action === 'upsert' && params.args?.create) {
      ensureId(modelName, params.args.create);
    }

    return next(params);
  });

  return prisma;
};
