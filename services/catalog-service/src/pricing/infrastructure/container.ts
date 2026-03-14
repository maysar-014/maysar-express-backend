import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../types';
import { PricingEngineFactory } from '../application/factories/pricing-engine.factory';
import { CalculatePriceUseCase } from '../application/use-cases/calculate-price.use-case';

export const container = new Container();

container.bind<PricingEngineFactory>(TYPES.PricingEngineFactory).to(PricingEngineFactory).inSingletonScope();
container.bind<CalculatePriceUseCase>(TYPES.CalculatePriceUseCase).to(CalculatePriceUseCase).inTransientScope();
