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
                const start = Date.now();
                const timeoutMs = Number(process.env.MODULE_INIT_TIMEOUT_MS || 0);
                const initPromise = module.initialize();

                if (timeoutMs > 0) {
                    await Promise.race([
                        initPromise,
                        new Promise((_, reject) => {
                            setTimeout(() => {
                                reject(new Error(`Initialization timed out after ${timeoutMs}ms`));
                            }, timeoutMs);
                        })
                    ]);
                } else {
                    await initPromise;
                }

                registryLogger.info(`Initialized ${module.name} in ${Date.now() - start}ms.`);
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
