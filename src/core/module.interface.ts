import { Router } from 'express';

export interface Module {
    name: string;
    initialize: () => void | Promise<void>;
    routes?: Router;
    shutdown?: () => void | Promise<void>;
}

export type ServiceModule = Module; // Keep alias for backward compatibility
