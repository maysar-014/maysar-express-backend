import { Module } from './module.interface';
import { createLogger } from '../../shared/logger/logger';

const registryLogger = createLogger('ModuleRegistry', 'core');

export class ModuleRegistry {
    private modules: Module[] = [];
    private moduleHealth: Map<string, 'healthy' | 'unhealthy'> = new Map();

    register(module: Module) {
        registryLogger.info(`Registering module: ${module.name}`);
        this.modules.push(module);
        this.moduleHealth.set(module.name, 'unhealthy');
    }

    async initializeAll() {
        registryLogger.info(`Initializing ${this.modules.length} modules...`);
        const totalStart = Date.now();

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

                this.moduleHealth.set(module.name, 'healthy');
                registryLogger.info(`Initialized ${module.name} in ${Date.now() - start}ms`);
            })
        );

        const failed = results
            .map((r, i) => (r.status === 'rejected' ? this.modules[i].name : null))
            .filter(Boolean);

        for (const [i, result] of results.entries()) {
            if (result.status === 'rejected') {
                this.moduleHealth.set(this.modules[i].name, 'unhealthy');
                registryLogger.error(`Failed to initialize module ${this.modules[i].name}:`, result.reason);
            }
        }

        if (failed.length > 0) {
            // Log the failures but do NOT crash the entire application.
            // A single module's database connection failure should degrade that
            // module's functionality, not prevent the entire monolith from booting.
            // The health endpoint (/ready) will report which modules are unhealthy.
            registryLogger.warn(
                `Modules failed to initialize (non-fatal, degraded mode): ${failed.join(', ')}. ` +
                `These modules will be unavailable but the server will continue serving requests.`
            );
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

    getModuleHealth() {
        return Object.fromEntries(this.moduleHealth);
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
