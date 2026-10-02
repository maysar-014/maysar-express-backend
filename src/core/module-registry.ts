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
        registryLogger.info(`Initializing ${this.modules.length} modules in parallel...`);
        const totalStart = Date.now();

        const allowFailure =
            process.env.ALLOW_MODULE_INIT_FAILURES === 'true' ||
            process.env.ALLOW_MODULE_INIT_FAILURES === '1' ||
            process.env.CONTRACT_TESTS === '1';

        const timeoutMs = Number(process.env.MODULE_INIT_TIMEOUT_MS || 0);

        const results = await Promise.allSettled(
            this.modules.map(async (module) => {
                const start = Date.now();
                registryLogger.info(`Initializing ${module.name}...`);

                const initPromise = module.initialize();
                if (timeoutMs > 0) {
                    await Promise.race([
                        initPromise,
                        new Promise<never>((_, reject) =>
                            setTimeout(
                                () => reject(new Error(`Initialization timed out after ${timeoutMs}ms`)),
                                timeoutMs
                            )
                        )
                    ]);
                } else {
                    await initPromise;
                }

                registryLogger.info(`Initialized ${module.name} in ${Date.now() - start}ms`);
            })
        );

        let hasUnrecoverableFailure = false;
        for (const [i, result] of results.entries()) {
            if (result.status === 'rejected') {
                registryLogger.error(`Failed to initialize module ${this.modules[i].name}:`, result.reason);
                if (!allowFailure) {
                    hasUnrecoverableFailure = true;
                } else {
                    registryLogger.warn(`Continuing without ${this.modules[i].name} due to initialization failure.`);
                }
            }
        }

        if (hasUnrecoverableFailure) {
            const failed = results
                .map((r, i) => (r.status === 'rejected' ? this.modules[i].name : null))
                .filter(Boolean)
                .join(', ');
            throw new Error(`Failed to initialize modules: ${failed}`);
        }

        registryLogger.info(`All modules initialized in ${Date.now() - totalStart}ms`);
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

/**
 * Canonical public mount path of a service module: `/api/` + the module name with
 * its `-service` suffix stripped, e.g. `commission-service` -> `/api/commission`.
 * Kept here so the bootstrap (src/app.ts) and the contract tests share one
 * derivation instead of duplicating the convention.
 */
export const resolveModuleMountPath = (moduleName: string): string =>
    `/api/${moduleName.replace(/-service$/, '')}`;

export const moduleRegistry = new ModuleRegistry();
