import { Router } from 'express';

export interface Module {
    name: string;
    initialize: () => Promise<void>;
    routes: Router;
    shutdown: () => Promise<void>;
}
