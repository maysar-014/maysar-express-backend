import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { moduleRegistry } from './core/module-registry';

export const createApp = () => {
    const app = express();

    // Global Middleware
    app.use(cors());
    app.use(helmet());
    app.use(compression());
    app.use(morgan('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Register module routes
    const modules = moduleRegistry.getModules();
    modules.forEach(module => {
        // Mount routes: /api/{service-name} (stripping '-service')
        const routeName = module.name.replace('-service', '');
        const routePath = `/api/${routeName}`;

        if (module.routes) {
            app.use(routePath, module.routes);
            console.log(`Mounted routes for ${module.name} at ${routePath}`);
        }
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            modules: modules.map(m => m.name)
        });
    });

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
};
