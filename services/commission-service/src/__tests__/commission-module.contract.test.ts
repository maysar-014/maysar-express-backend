/**
 * DEF-006 regression guard — the commission module must be reachable at the
 * canonical public path declared in the platform contract.
 *
 * The bootstrap derives a module's mount path from its name
 * (`resolveModuleMountPath`: the name minus its `-service` suffix, under `/api`).
 * The module was named `commissions-service`, so it mounted at `/api/commissions`
 * while every documented, probed and tested path is `/api/commission/*` — every
 * call answered 404.
 *
 * This test mounts the real module router exactly the way `src/app.ts` does and
 * asserts that every `/api/commission*` operation declared in `openapi.yaml` is
 * registered (a registered route answers with its own status — 401 from the auth
 * middleware, 400/5xx from the handler — never 404).
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import yaml from 'yaml';
import { resolveModuleMountPath } from '../../../../src/core/module-registry';
import { CommissionModule } from '../../index';

const repoRoot = path.resolve(__dirname, '../../../../');
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const concretePath = (routePath: string): string =>
  routePath.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, param: string) =>
    param.toLowerCase().includes('id') ? 'c1234567890abcdef' : `test-${param}`,
  );

const readCommissionOperations = (): Array<{ method: string; path: string }> => {
  const spec = yaml.parse(fs.readFileSync(path.join(repoRoot, 'openapi.yaml'), 'utf8')) as {
    paths?: Record<string, Record<string, unknown>>;
  };
  const operations: Array<{ method: string; path: string }> = [];

  for (const [routePath, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!routePath.startsWith('/api/commission')) continue;
    for (const method of HTTP_METHODS) {
      if (pathItem?.[method]) operations.push({ method, path: routePath });
    }
  }
  return operations;
};

describe('commission module mount contract (DEF-006)', () => {
  it('derives the canonical /api/commission mount path from the module name', () => {
    expect(CommissionModule.name).toBe('commission-service');
    expect(resolveModuleMountPath(CommissionModule.name)).toBe('/api/commission');
  });

  it('registers every /api/commission operation declared in the platform contract', async () => {
    const app = express();
    app.use(express.json());
    app.use(resolveModuleMountPath(CommissionModule.name), CommissionModule.routes!);

    const operations = readCommissionOperations();
    expect(operations.length).toBeGreaterThanOrEqual(8);

    const unregistered: Array<{ method: string; path: string; status: number }> = [];

    for (const operation of operations) {
      const call = (request(app) as unknown as Record<string, (url: string) => request.Test>)[
        operation.method
      ](concretePath(operation.path));
      const response =
        operation.method === 'get' || operation.method === 'delete' ? await call : await call.send({});

      if (response.status === 404) {
        unregistered.push({ method: operation.method, path: operation.path, status: response.status });
      }
    }

    expect(unregistered).toEqual([]);
  });

  it('exposes every commission path the live E2E suite calls', async () => {
    const app = express();
    app.use(express.json());
    app.use(resolveModuleMountPath(CommissionModule.name), CommissionModule.routes!);

    // Every live E2E suite that calls a commission path requests the module's
    // public surface. When the module name regressed to `commissions-service` the
    // suites kept calling `/api/commission/*` and every call answered 404, so the
    // E2E paths are part of the mount contract too.
    const collectE2eFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectE2eFiles(full);
        return entry.name.endsWith('.test.ts') ? [full] : [];
      });

    const e2eSource = collectE2eFiles(path.join(repoRoot, 'tests', 'e2e'))
      .map(file => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const e2ePaths = Array.from(
      new Set(
        (e2eSource.match(/\/api\/commission[a-zA-Z0-9/{}$.:-]*/g) ?? []).map(routePath =>
          routePath.replace(/\$\{[^}]*\}/g, 'c1234567890abcdef').replace(/\/+$/, ''),
        ),
      ),
    );

    expect(e2ePaths.length).toBeGreaterThanOrEqual(4);

    const unregistered: Array<{ path: string; statuses: number[] }> = [];

    for (const routePath of e2ePaths) {
      const statuses = [
        (await request(app).get(routePath)).status,
        (await request(app).post(routePath).send({})).status,
        (await request(app).put(routePath).send({})).status,
      ];

      // Registered = reachable by at least one documented method (401/400/2xx);
      // 404 on every method means the path is not mounted at all.
      if (statuses.every(status => status === 404)) {
        unregistered.push({ path: routePath, statuses });
      }
    }

    expect(unregistered).toEqual([]);
  });

  it('answers the documented liveness probe without authentication', async () => {
    const app = express();
    app.use(resolveModuleMountPath(CommissionModule.name), CommissionModule.routes!);

    const response = await request(app).get('/api/commission/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('commission-service');
  });
});
