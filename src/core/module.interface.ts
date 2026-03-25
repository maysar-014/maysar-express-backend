import { Router } from 'express';

export interface ModuleRouteAlias {
    path: string;
    router: Router;
}

export interface Module {
    name: string;
    initialize: () => void | Promise<void>;
    routes?: Router;
    routeAliases?: ModuleRouteAlias[];
    shutdown?: () => void | Promise<void>;
}

export type ServiceModule = Module; // Keep alias for backward compatibility
