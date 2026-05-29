import type { Module } from '../../src/core/module.interface';
import { createGovernanceRoutes } from './src/api/routes/governance.routes';
import { createGovernanceServiceEnvironment } from './src/bootstrap';

export const GovernanceModule: Module = {
  name: 'governance-service',

  initialize: async () => {
    const { controller } = createGovernanceServiceEnvironment();
    GovernanceModule.routes = createGovernanceRoutes(controller);
  },
};
