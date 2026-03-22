import { Module } from './module.interface';
import { createLogger } from '../../shared/logger/logger';

const registryLogger = createLogger('ModuleRegistry', 'core');

export class ModuleRegistry {
    private modules: Module[] = [];

    register(module: Module) {
        registryLogger.info(`Registering module: ${module.name}`);
        this.modules.push(module);
    }

    async initializeAll() {
        registryLogger.info('Initializing all modules...');
        for (const module of this.modules) {
            try {
                registryLogger.info(`Initializing ${module.name}...`);
                await module.initialize();
            } catch (error) {
                registryLogger.error(`Failed to initialize module ${module.name}:`, error);
                const allowFailure =
                    process.env.ALLOW_MODULE_INIT_FAILURES === 'true' ||
                    process.env.ALLOW_MODULE_INIT_FAILURES === '1' ||
                    process.env.CONTRACT_TESTS === '1';
                if (!allowFailure) {
                    throw error;
                }
                registryLogger.warn(`Continuing without ${module.name} due to initialization failure.`);
            }
        }
    }

    async shutdownAll() {
        registryLogger.info('Shutting down all modules...');
        for (const module of this.modules.slice().reverse()) {
            try {
                await module.shutdown?.();
            } catch (error) {
                registryLogger.error(`Error shutting down module ${module.name}:`, error);
            }
        }
    }

    getModules() {
        return this.modules;
    }
}

export const moduleRegistry = new ModuleRegistry();
