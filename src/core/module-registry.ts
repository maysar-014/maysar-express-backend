import { Module } from './module.interface';

export class ModuleRegistry {
    private modules: Module[] = [];

    register(module: Module) {
        console.log(`Registering module: ${module.name}`);
        this.modules.push(module);
    }

    async initializeAll() {
        console.log('Initializing all modules...');
        for (const module of this.modules) {
            try {
                console.log(`Initializing ${module.name}...`);
                await module.initialize();
            } catch (error) {
                console.error(`Failed to initialize module ${module.name}:`, error);
                throw error;
            }
        }
    }

    async shutdownAll() {
        console.log('Shutting down all modules...');
        for (const module of this.modules.slice().reverse()) {
            try {
                await module.shutdown();
            } catch (error) {
                console.error(`Error shutting down module ${module.name}:`, error);
            }
        }
    }

    getModules() {
        return this.modules;
    }
}

export const moduleRegistry = new ModuleRegistry();
