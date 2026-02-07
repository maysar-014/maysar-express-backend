/**
 * Layer Isolation Architectural Tests
 *
 * Constitution Section 2: The Sovereign Layer Model - Strict layer responsibilities
 * Constitution Section 3: Business Core Protection Principle - Dependencies point inward only
 * Constitution Section 10: File Structure Mandate - Enforced folder ownership
 */

import * as fs from 'fs';
import * as path from 'path';

// Test data - file structure validation - use process.cwd() for reliable path resolution
const SRC_DIR = path.join(process.cwd(), 'src');
const DOMAIN_DIR = path.join(SRC_DIR, 'domain');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');
const INFRASTRUCTURE_DIR = path.join(SRC_DIR, 'infrastructure');
const API_DIR = path.join(SRC_DIR, 'api');

describe('Layer Isolation Architectural Tests', () => {
  describe('File Structure Compliance', () => {
    it('should enforce mandated folder structure', () => {
      // Constitution Section 10: File Structure Mandate
      const requiredDirs = [
        'domain/entities',
        'domain/value-objects',
        'domain/engines',
        'domain/policies',
        'domain/algorithms',
        'domain/events',
        'application/use-cases',
        'application/sagas',
        'application/dto',
        'application/mappers',
        'infrastructure/repositories',
        'infrastructure/messaging',
        'infrastructure/providers',
        'infrastructure/cache',
        'api/controllers',
        'api/routes',
        'api/validators'
      ];

      requiredDirs.forEach(dir => {
        const fullPath = path.join(SRC_DIR, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      });
    });

    it('should validate layer sovereignty - no domain files outside domain/', () => {
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      // Domain entities should not exist outside domain/
      const nonDomainEntities = findFilesOutsideDomain('**/entities/**/*.ts');
      expect(nonDomainEntities).toHaveLength(0);

      // Domain value objects should not exist outside domain/
      const nonDomainValueObjects = findFilesOutsideDomain('**/value-objects/**/*.ts');
      expect(nonDomainValueObjects).toHaveLength(0);

      // Domain policies should not exist outside domain/
      const nonDomainPolicies = findFilesOutsideDomain('**/policies/**/*.ts');
      expect(nonDomainPolicies).toHaveLength(0);
    });

    it('should validate application layer structure', () => {
      const appFiles = findFilesRecursive(APPLICATION_DIR, /\.ts$/);

      // Application should have sagas
      const sagaFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'sagas'), /\.ts$/);
      expect(sagaFiles.length).toBeGreaterThan(0);

      // Application should have use cases
      const useCaseFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'use-cases'), /\.ts$/);
      expect(useCaseFiles.length).toBeGreaterThan(0);
    });

    it('should validate infrastructure layer adapters', () => {
      const infraFiles = findFilesRecursive(INFRASTRUCTURE_DIR, /\.ts$/);

      // Should have repositories
      const repoFiles = findFilesRecursive(path.join(INFRASTRUCTURE_DIR, 'repositories'), /\.ts$/);
      expect(repoFiles.length).toBeGreaterThan(0);

      // Should have providers
      const providerFiles = findFilesRecursive(path.join(INFRASTRUCTURE_DIR, 'providers'), /\.ts$/);
      expect(providerFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Direction Validation', () => {
    it('should enforce inward dependency rule - domain imports nothing outward', () => {
      // Constitution Section 3: Dependencies may point only inward
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      domainFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        // Domain should not import from application, infrastructure, or api
        const invalidImports = imports.filter(imp =>
          imp.includes('../application') ||
          imp.includes('../infrastructure') ||
          imp.includes('../api') ||
          imp.includes('express') ||
          imp.includes('typeorm') ||
          imp.includes('mongoose') ||
          imp.includes('axios') ||
          imp.includes('redis') ||
          imp.includes('kafka') ||
          imp.includes('prisma')
        );

        expect(invalidImports).toHaveLength(0);
      });
    });

    it('should allow application to import from domain only', () => {
      const appFiles = findFilesRecursive(APPLICATION_DIR, /\.ts$/);

      appFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        // Application can import from domain
        const allowedImports = imports.filter(imp =>
          imp.includes('../domain') ||
          imp.includes('./') ||
          !imp.startsWith('../')
        );

        // Application should not import infrastructure directly (use ports)
        const infraImports = imports.filter(imp =>
          imp.includes('../infrastructure') && !imp.includes('ports')
        );

        expect(infraImports).toHaveLength(0);
      });
    });

    it('should allow infrastructure to import from domain and application', () => {
      const infraFiles = findFilesRecursive(INFRASTRUCTURE_DIR, /\.ts$/);

      infraFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        // Infrastructure can import domain entities and ports
        // Infrastructure can import application DTOs
        const allowedImports = imports.filter(imp =>
          imp.includes('../domain') ||
          imp.includes('../application') ||
          imp.includes('./') ||
          !imp.startsWith('../')
        );

        // Should not have unexpected imports
        expect(allowedImports.length).toBe(imports.length);
      });
    });

    it('should allow API to import from all layers', () => {
      const apiFiles = findFilesRecursive(API_DIR, /\.ts$/);

      apiFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        // API can import from all layers
        const allowedImports = imports.filter(imp =>
          imp.includes('../domain') ||
          imp.includes('../application') ||
          imp.includes('../infrastructure') ||
          imp.includes('./') ||
          !imp.startsWith('../')
        );

        expect(allowedImports.length).toBe(imports.length);
      });
    });
  });

  describe('Domain Layer Purity', () => {
    it('should enforce domain purity rule - no framework imports', () => {
      // Constitution Section 4.1: Domain Purity Rule
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      const forbiddenImports = [
        'express',
        'fastify',
        'typeorm',
        'mongoose',
        'prisma',
        'axios',
        'node-fetch',
        'redis',
        'ioredis',
        'kafkajs',
        'amqplib',
        'socket.io',
        'ws',
        'dotenv',
        'joi',
        'yup',
        'zod',
        'class-validator',
        'bcrypt',
        'jsonwebtoken',
        'passport',
        'multer',
        'cors',
        'helmet',
        'compression'
      ];

      domainFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        const frameworkImports = imports.filter(imp =>
          forbiddenImports.some(forbidden => imp.includes(forbidden))
        );

        expect(frameworkImports).toHaveLength(0);
      });
    });

    it('should enforce domain purity rule - no environment variables', () => {
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      domainFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Should not access process.env
        expect(content).not.toMatch(/process\.env/);

        // Should not import config or env modules
        const imports = extractImports(content);
        const envImports = imports.filter(imp =>
          imp.includes('config') ||
          imp.includes('env') ||
          imp.includes('dotenv')
        );

        expect(envImports).toHaveLength(0);
      });
    });

    it('should enforce domain purity rule - no network or file system access', () => {
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      domainFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Should not use fs, path, http, https modules
        const forbiddenModules = [
          'fs',
          'path',
          'http',
          'https',
          'url',
          'querystring',
          'crypto',
          'os',
          'child_process',
          'cluster',
          'worker_threads'
        ];

        const imports = extractImports(content);
        const forbiddenModuleImports = imports.filter(imp =>
          forbiddenModules.some(forbidden => imp.includes(forbidden))
        );

        expect(forbiddenModuleImports).toHaveLength(0);
      });
    });

    it('should validate domain immutability - no external dependencies', () => {
      // Constitution Section 4.2: Business Truth Immutability Rule
      const domainFiles = findFilesRecursive(DOMAIN_DIR, /\.ts$/);

      domainFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const imports = extractImports(content);

        // Domain should be self-contained or only import from standard library
        const externalImports = imports.filter(imp =>
          !imp.includes('./') &&
          !imp.includes('../') &&
          !imp.startsWith('@types/') &&
          imp !== 'jest' // Allow test imports
        );

        // Should only import standard library types or test utilities
        const allowedExternal = ['node'];
        const invalidExternal = externalImports.filter(imp =>
          !allowedExternal.includes(imp)
        );

        expect(invalidExternal).toHaveLength(0);
      });
    });
  });

  describe('Application Layer Coordination', () => {
    it('should enforce orchestration exclusivity rule - only sagas coordinate services', () => {
      // Constitution Section 6.1: Orchestration Exclusivity Rule
      const appFiles = findFilesRecursive(APPLICATION_DIR, /\.ts$/);

      appFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Controllers should not orchestrate multiple services
        if (file.includes('controller')) {
          const orchestrationPatterns = [
            /await.*repository.*find/,
            /await.*repository.*create/,
            /await.*repository.*update/,
            /await.*provider.*get/,
            /await.*publisher.*publish/
          ];

          orchestrationPatterns.forEach(pattern => {
            expect(content).not.toMatch(pattern);
          });
        }
      });
    });

    it('should validate saga structure and compensation', () => {
      const sagaFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'sagas'), /\.ts$/);

      // Filter out registry files that don't implement saga logic
      const actualSagaFiles = sagaFiles.filter(file =>
        !file.includes('saga-registry') && !file.includes('base.saga')
      );

      actualSagaFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Sagas should have compensation methods or error handling
        expect(content).toMatch(/addCompensation|compensate|rollback|catch|try|error/);

        // Sagas should handle failures
        expect(content).toMatch(/catch|try|error|failure/);

        // Sagas should publish events or handle coordination
        expect(content).toMatch(/publish|emit|event|execute|handle/);
      });
    });

    it('should validate use case isolation', () => {
      const useCaseFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'use-cases'), /\.ts$/);

      useCaseFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Use cases should orchestrate single business operations
        expect(content).toMatch(/execute|handle|perform/);

        // Use cases should not contain domain logic
        const domainLogicPatterns = [
          /if.*rating/,
          /if.*distance/,
          /calculate.*score/,
          /validate.*business.*rule/
        ];

        domainLogicPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Infrastructure Layer Implementation', () => {
    it('should validate adapter pattern implementation', () => {
      const adapterFiles = findFilesRecursive(INFRASTRUCTURE_DIR, /\.adapter\.ts$/);

      adapterFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Adapters should implement port interfaces
        expect(content).toMatch(/implements.*Port/);

        // Adapters should handle external system communication
        expect(content).toMatch(/http|api|database|cache|message/);
      });
    });

    it('should validate repository pattern implementation', () => {
      const repoFiles = findFilesRecursive(path.join(INFRASTRUCTURE_DIR, 'repositories'), /\.ts$/);

      repoFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Repositories should implement domain repository interfaces
        expect(content).toMatch(/implements.*I.*Repository/);

        // Repositories should handle data persistence
        expect(content).toMatch(/find|create|update|delete|save/);
      });
    });

    it('should enforce infrastructure isolation - no business logic', () => {
      const infraFiles = findFilesRecursive(INFRASTRUCTURE_DIR, /\.ts$/);

      infraFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Infrastructure should not contain business rules
        const businessLogicPatterns = [
          /if.*status.*===/,
          /if.*rating.*>/,
          /if.*distance.*</,
          /calculate.*business/,
          /validate.*business.*rule/
        ];

        businessLogicPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });
  });

  describe('API Layer Transport', () => {
    it('should validate controller structure', () => {
      const controllerFiles = findFilesRecursive(path.join(API_DIR, 'controllers'), /\.ts$/);

      controllerFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Controllers should handle HTTP requests/responses
        expect(content).toMatch(/req|res|request|response/);

        // Controllers should validate input
        expect(content).toMatch(/validate|schema|joi|yup|zod/);

        // Controllers should not implement workflows
        const workflowPatterns = [
          /if.*status.*change/,
          /await.*multiple.*services/,
          /transaction.*multiple/
        ];

        workflowPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });

    it('should validate middleware implementation', () => {
      const middlewareFiles = findFilesRecursive(path.join(API_DIR, 'middleware'), /\.ts$/);

      middlewareFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Middleware should have next parameter
        expect(content).toMatch(/next|NextFunction/);

        // Middleware should handle cross-cutting concerns
        expect(content).toMatch(/auth|validation|logging|cors|security/);
      });
    });

    it('should validate route definitions', () => {
      const routeFiles = findFilesRecursive(path.join(API_DIR, 'routes'), /\.ts$/);

      routeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Routes should define HTTP endpoints
        expect(content).toMatch(/router\.|app\.|\.get|\.post|\.put|\.delete/);

        // Routes should map to controllers
        expect(content).toMatch(/controller|handler/);
      });
    });
  });

  describe('Cross-Layer Data Flow', () => {
    it('should enforce DTO firewall rule - no domain entities cross service boundaries', () => {
      // Constitution Section 9: DTO Firewall Rule
      const apiFiles = findFilesRecursive(API_DIR, /\.ts$/);

      apiFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // API should not directly use domain entities
        const entityImports = extractImports(content).filter(imp =>
          imp.includes('../domain/entities') ||
          imp.includes('CourierEntity') ||
          imp.includes('DeliveryEntity')
        );

        expect(entityImports).toHaveLength(0);
      });
    });

    it('should validate data transformation layers', () => {
      const mapperFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'mappers'), /\.ts$/);

      mapperFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // Mappers should transform between layers
        expect(content).toMatch(/toDomain|toDTO|fromDomain|toEntity/);

        // Mappers should handle data structure conversion
        expect(content).toMatch(/map|transform|convert/);
      });
    });

    it('should validate command and event structures', () => {
      const dtoFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'dto'), /\.ts$/);

      dtoFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');

        // DTOs should be simple data structures
        expect(content).toMatch(/interface|class|type/);

        // DTOs should not contain business logic
        expect(content).not.toMatch(/function|method|calculate/);
      });
    });
  });

  describe('Architectural Fitness Functions', () => {
    it('should validate circular dependency prevention', () => {
      const allFiles = findFilesRecursive(SRC_DIR, /\.ts$/);
      const dependencyGraph = buildDependencyGraph(allFiles);

      // Check for circular dependencies
      const cycles = detectCircularDependencies(dependencyGraph);
      expect(cycles).toHaveLength(0);
    });

    it('should validate abstraction levels', () => {
      // Domain should be most abstract
      // Infrastructure should be most concrete
      const domainAbstraction = calculateAbstractionLevel(DOMAIN_DIR);
      const appAbstraction = calculateAbstractionLevel(APPLICATION_DIR);
      const infraAbstraction = calculateAbstractionLevel(INFRASTRUCTURE_DIR);
      const apiAbstraction = calculateAbstractionLevel(API_DIR);

      expect(domainAbstraction).toBeGreaterThan(appAbstraction);
      expect(appAbstraction).toBeGreaterThan(infraAbstraction);
      expect(infraAbstraction).toBeGreaterThan(apiAbstraction);
    });

    it('should validate test coverage distribution', () => {
      // Each layer should have appropriate test coverage
      const domainTests = findFilesRecursive(path.join(__dirname, '../domain'), /\.test\.ts$/);
      const appTests = findFilesRecursive(path.join(__dirname, '../application'), /\.test\.ts$/);
      const integrationTests = findFilesRecursive(path.join(__dirname, '../integration'), /\.test\.ts$/);

      expect(domainTests.length).toBeGreaterThan(0);
      expect(appTests.length).toBeGreaterThan(0);
      expect(integrationTests.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions
function findFilesRecursive(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

function findFilesOutsideDomain(pattern: string): string[] {
  const allMatchingFiles = findFilesRecursive(SRC_DIR, /\.ts$/).filter(file =>
    file.includes('/entities/') ||
    file.includes('/value-objects/') ||
    file.includes('/policies/')
  );

  return allMatchingFiles.filter(file => !file.startsWith(DOMAIN_DIR));
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function buildDependencyGraph(files: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractImports(content);
    const relativeImports = imports
      .filter(imp => imp.startsWith('../') || imp.startsWith('./'))
      .map(imp => path.resolve(path.dirname(file), imp));

    graph.set(file, relativeImports);
  });

  return graph;
}

function detectCircularDependencies(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string, path: string[]) {
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }

    if (visited.has(node)) return;

    visiting.add(node);
    path.push(node);

    const dependencies = graph.get(node) || [];
    dependencies.forEach(dep => {
      if (fs.existsSync(dep)) {
        dfs(dep, [...path]);
      }
    });

    visiting.delete(node);
    visited.add(node);
    path.pop();
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function calculateAbstractionLevel(dir: string): number {
  const files = findFilesRecursive(dir, /\.ts$/);
  let totalAbstraction = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Count abstract indicators
    let abstraction = 0;
    if (content.includes('interface')) abstraction += 2;
    if (content.includes('abstract')) abstraction += 2;
    if (content.includes('implements')) abstraction += 1;
    if (content.includes('extends')) abstraction += 1;
    if (content.includes('private')) abstraction += 1;
    if (content.includes('public')) abstraction += 0.5;

    // Subtract concrete indicators
    if (content.includes('new ')) abstraction -= 1;
    if (content.includes('http')) abstraction -= 2;
    if (content.includes('database')) abstraction -= 2;
    if (content.includes('fs.')) abstraction -= 2;

    totalAbstraction += Math.max(0, abstraction);
  });

  return files.length > 0 ? totalAbstraction / files.length : 0;
}
