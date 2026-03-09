import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ArchitecturalAnalysisEngine } from './architectural-analysis';

const writeFile = (filePath: string, content: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
};

describe('ArchitecturalAnalysisEngine', () => {
  let tmpRoot: string;
  let srcPath: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-analysis-'));
    srcPath = path.join(tmpRoot, 'src').replace(/\\/g, '/');
    fs.mkdirSync(srcPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('analyze aggregates summary, layer metrics, and compliance payloads', async () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const addViolation = (
      engine as unknown as {
        addViolation: (v: {
          rule: string;
          severity: 'critical' | 'error' | 'warning' | 'info';
          file: string;
          message: string;
        }) => void;
      }
    ).addViolation.bind(engine);

    jest
      .spyOn(
        engine as unknown as { analyzeFileStructure: () => Promise<void> },
        'analyzeFileStructure'
      )
      .mockImplementation(async () => {
        addViolation({ rule: 'r1', severity: 'critical', file: `${srcPath}/domain/a.ts`, message: 'c1' });
      });
    jest
      .spyOn(
        engine as unknown as { analyzeDependencies: () => Promise<void> },
        'analyzeDependencies'
      )
      .mockImplementation(async () => {
        addViolation({ rule: 'r2', severity: 'error', file: `${srcPath}/application/b.ts`, message: 'e1' });
      });
    jest
      .spyOn(
        engine as unknown as { analyzeLayerIsolation: () => Promise<void> },
        'analyzeLayerIsolation'
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        engine as unknown as { analyzeNamingConventions: () => Promise<void> },
        'analyzeNamingConventions'
      )
      .mockImplementation(async () => {
        addViolation({ rule: 'r3', severity: 'warning', file: `${srcPath}/infrastructure/c.ts`, message: 'w1' });
      });
    jest
      .spyOn(
        engine as unknown as { analyzeDesignPatterns: () => Promise<void> },
        'analyzeDesignPatterns'
      )
      .mockImplementation(async () => {
        addViolation({ rule: 'r4', severity: 'info', file: `${srcPath}/api/d.ts`, message: 'i1' });
      });
    jest
      .spyOn(
        engine as unknown as { analyzeTestCoverage: () => Promise<void> },
        'analyzeTestCoverage'
      )
      .mockResolvedValue(undefined);

    jest
      .spyOn(
        engine as unknown as { getAllTypeScriptFiles: () => Promise<string[]> },
        'getAllTypeScriptFiles'
      )
      .mockResolvedValue([
        `${srcPath}/domain/a.ts`,
        `${srcPath}/application/b.ts`,
        `${srcPath}/infrastructure/c.ts`,
        `${srcPath}/api/d.ts`
      ]);

    jest
      .spyOn(
        engine as unknown as { calculateLayerMetrics: () => Promise<unknown> },
        'calculateLayerMetrics'
      )
      .mockResolvedValue({
        domain: { files: 1, dependencies: 0, violations: 1, compliance: 90 },
        application: { files: 1, dependencies: 0, violations: 1, compliance: 90 },
        infrastructure: { files: 1, dependencies: 0, violations: 1, compliance: 90 },
        api: { files: 1, dependencies: 0, violations: 1, compliance: 90 }
      });
    jest
      .spyOn(
        engine as unknown as { checkConstitutionCompliance: () => unknown },
        'checkConstitutionCompliance'
      )
      .mockReturnValue({
        section1: false,
        section2: false,
        section3: true,
        section5: true,
        section6: true
      });

    const result = await engine.analyze();

    expect(result.summary).toEqual({
      totalFiles: 4,
      violations: 4,
      critical: 1,
      errors: 1,
      warnings: 1,
      info: 1,
      complianceScore: 82
    });
    expect(result.violations).toHaveLength(4);
    expect(result.constitutionCompliance.section1).toBe(false);
  });

  it('extracts imports and detects basic helper patterns', () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const content = `
      import { A } from './a';
      import { B } from "../b";
      class Sample {
        field1 = 1;
      }
      interface Big { a: string; b: string; c: string; d: string; e: string; f: string; g: string; h: string; i: string; j: string; k: string; }
      if (a && b) {}
      for (let i = 0; i < 1; i++) {}
      calculateScore();
    `;

    const imports = (
      engine as unknown as { extractImports: (text: string) => string[] }
    ).extractImports(content);
    const hasBusinessLogic = (
      engine as unknown as { containsBusinessLogic: (text: string) => boolean }
    ).containsBusinessLogic(content);
    const hasLargeInterface = (
      engine as unknown as { hasLargeInterface: (text: string) => boolean }
    ).hasLargeInterface(content);

    const largeClassContent = `class BigClass {\n${Array.from({ length: 55 }, (_, i) => `line${i} = ${i};`).join('\n')}\n}`;
    const hasLargeClass = (
      engine as unknown as { hasLargeClass: (text: string) => boolean }
    ).hasLargeClass(largeClassContent);

    expect(imports).toEqual(['./a', '../b']);
    expect(hasBusinessLogic).toBe(true);
    expect(hasLargeInterface).toBe(true);
    expect(hasLargeClass).toBe(true);
  });

  it('classifies layers and computes compliance score/constitution status', () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const addViolation = (
      engine as unknown as {
        addViolation: (v: {
          rule: string;
          severity: 'critical' | 'error' | 'warning' | 'info';
          file: string;
          message: string;
          constitutionSection?: string;
        }) => void;
      }
    ).addViolation.bind(engine);

    addViolation({
      rule: 'critical-rule',
      severity: 'critical',
      file: `${srcPath}/domain/a.ts`,
      message: 'critical',
      constitutionSection: '2'
    });
    addViolation({
      rule: 'ddd-warning',
      severity: 'warning',
      file: `${srcPath}/domain/entity.ts`,
      message: 'warning',
      constitutionSection: '3'
    });
    addViolation({
      rule: 'info-rule',
      severity: 'info',
      file: `${srcPath}/api/c.ts`,
      message: 'info'
    });

    const getFileLayer = (
      engine as unknown as { getFileLayer: (file: string) => string }
    ).getFileLayer.bind(engine);
    const score = (
      engine as unknown as { calculateComplianceScore: () => number }
    ).calculateComplianceScore();
    const compliance = (
      engine as unknown as {
        checkConstitutionCompliance: () => {
          section1: boolean;
          section2: boolean;
          section3: boolean;
          section5: boolean;
          section6: boolean;
        };
      }
    ).checkConstitutionCompliance();

    expect(getFileLayer(`${srcPath}/domain/sample.ts`)).toBe('unknown');
    expect(getFileLayer(`${srcPath}/application/sample.ts`)).toBe('unknown');
    expect(getFileLayer(`${srcPath}/infrastructure/sample.ts`)).toBe('unknown');
    expect(getFileLayer(`${srcPath}/api/sample.ts`)).toBe('unknown');
    expect(getFileLayer(`${srcPath}/misc/sample.ts`)).toBe('unknown');
    expect(score).toBe(87);
    expect(compliance).toEqual({
      section1: false,
      section2: false,
      section3: false,
      section5: true,
      section6: true
    });
  });

  it('records and filters violations by severity and constitution section', () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const addViolation = (
      engine as unknown as {
        addViolation: (v: {
          rule: string;
          severity: 'critical' | 'error' | 'warning' | 'info';
          file: string;
          message: string;
          constitutionSection?: string;
        }) => void;
      }
    ).addViolation.bind(engine);

    addViolation({
      rule: 'r1',
      severity: 'warning',
      file: `${srcPath}/a.ts`,
      message: 'w',
      constitutionSection: '6'
    });
    addViolation({
      rule: 'r2',
      severity: 'error',
      file: `${srcPath}/b.ts`,
      message: 'e'
    });

    expect(engine.getViolations()).toHaveLength(2);
    expect(engine.getViolationsBySeverity('warning')).toHaveLength(1);
    expect(engine.getConstitutionViolations()).toHaveLength(1);
  });

  it('analyzes dependencies and detects layer direction violations', async () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const domainFile = `${srcPath}/domain/core.ts`;
    const appFile = `${srcPath}/application/use.ts`;

    writeFile(
      domainFile,
      `
      import infra from '../infrastructure/repo';
      import api from '../api/controller';
      import selfRef from '${domainFile.replace('.ts', '')}';
      export const x = 1;
    `
    );
    writeFile(appFile, `import x from '../api/controller'; export const use = x;`);

    jest
      .spyOn(
        engine as unknown as { getAllTypeScriptFiles: () => Promise<string[]> },
        'getAllTypeScriptFiles'
      )
      .mockResolvedValue([domainFile, appFile]);
    jest
      .spyOn(
        engine as unknown as { getFileLayer: (file: string) => string },
        'getFileLayer'
      )
      .mockImplementation(file => {
        if (file.includes('/domain/')) return 'domain';
        if (file.includes('/application/')) return 'application';
        if (file.includes('/infrastructure/')) return 'infrastructure';
        if (file.includes('/api/')) return 'api';
        return 'unknown';
      });

    await (
      engine as unknown as { analyzeDependencies: () => Promise<void> }
    ).analyzeDependencies();

    const rules = engine.getViolations().map(v => v.rule);
    expect(rules).toEqual(
      expect.arrayContaining(['dependency-direction', 'circular-dependency'])
    );
    expect(engine.getViolationsBySeverity('critical').length).toBeGreaterThan(0);
    expect(engine.getViolationsBySeverity('error').length).toBeGreaterThan(0);
  });

  it('analyzes layer isolation, naming, design patterns, and test coverage', async () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const domainLeakFile = `${srcPath}/domain/leak.ts`;
    const infraLogicFile = `${srcPath}/infrastructure/logic.ts`;
    const badEntityName = `${srcPath}/domain/entities/user.ts`;
    const badValueObjectName = `${srcPath}/domain/value-objects/price.ts`;
    const badPortName = `${srcPath}/domain/ports/storage.ts`;
    const badRepoName = `${srcPath}/infrastructure/repositories/account.ts`;
    const badProviderName = `${srcPath}/infrastructure/providers/maps.ts`;
    const largeClassFile = `${srcPath}/domain/large-class.ts`;
    const appClassNoCtorFile = `${srcPath}/application/no-di.ts`;
    const largeInterfaceFile = `${srcPath}/domain/large-interface.ts`;
    const sourceWithoutTest = `${srcPath}/application/service.ts`;
    const poorTestFile = `${srcPath}/application/service.test.ts`;

    writeFile(domainLeakFile, `import { Request } from 'express'; const db = 'supabase prisma'; export default db;`);
    writeFile(infraLogicFile, `for (let i = 0; i < 1; i++) { if (a && b) {} }`);
    writeFile(badEntityName, `export class User {}`);
    writeFile(badValueObjectName, `export class Price {}`);
    writeFile(badPortName, `export interface Storage {}`);
    writeFile(badRepoName, `export class AccountRepo {}`);
    writeFile(badProviderName, `export class MapsProvider {}`);
    writeFile(largeClassFile, `class Big {\n${Array.from({ length: 60 }, (_, i) => `x${i}=1;`).join('\n')}\n}`);
    writeFile(appClassNoCtorFile, `export class AppService { execute() { return true; } }`);
    writeFile(largeInterfaceFile, `interface BigI { ${Array.from({ length: 12 }, (_, i) => `m${i}: string;`).join(' ')} }`);
    writeFile(sourceWithoutTest, `export const service = () => true;`);
    writeFile(poorTestFile, `const noDescribe = true;`);

    const allFiles = [
      domainLeakFile,
      infraLogicFile,
      badEntityName,
      badValueObjectName,
      badPortName,
      badRepoName,
      badProviderName,
      largeClassFile,
      appClassNoCtorFile,
      largeInterfaceFile,
      sourceWithoutTest,
      poorTestFile
    ];

    jest
      .spyOn(
        engine as unknown as { getAllTypeScriptFiles: () => Promise<string[]> },
        'getAllTypeScriptFiles'
      )
      .mockResolvedValue(allFiles);
    jest
      .spyOn(
        engine as unknown as { getFileLayer: (file: string) => string },
        'getFileLayer'
      )
      .mockImplementation(file => {
        if (file.includes('/domain/')) return 'domain';
        if (file.includes('/application/')) return 'application';
        if (file.includes('/infrastructure/')) return 'infrastructure';
        if (file.includes('/api/')) return 'api';
        return 'unknown';
      });

    await (
      engine as unknown as { analyzeLayerIsolation: () => Promise<void> }
    ).analyzeLayerIsolation();
    await (
      engine as unknown as { analyzeNamingConventions: () => Promise<void> }
    ).analyzeNamingConventions();
    await (
      engine as unknown as { analyzeDesignPatterns: () => Promise<void> }
    ).analyzeDesignPatterns();
    await (
      engine as unknown as { analyzeTestCoverage: () => Promise<void> }
    ).analyzeTestCoverage();

    const rules = engine.getViolations().map(v => v.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        'infrastructure-leakage',
        'business-logic-leakage',
        'framework-coupling',
        'naming-convention',
        'single-responsibility',
        'dependency-injection',
        'interface-segregation',
        'test-coverage',
        'test-quality'
      ])
    );
  });

  it('calculates layer metrics from files and violations', async () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    const domainFile = `${srcPath}/domain/d.ts`;
    const appFile = `${srcPath}/application/a.ts`;
    const infraFile = `${srcPath}/infrastructure/i.ts`;
    const apiFile = `${srcPath}/api/r.ts`;

    writeFile(domainFile, `import x from './x';`);
    writeFile(appFile, `import y from '../domain/d';`);
    writeFile(infraFile, `import z from '../application/a'; import w from '../domain/d';`);
    writeFile(apiFile, `import a from '../application/a'; import b from '../infrastructure/i';`);

    const addViolation = (
      engine as unknown as {
        addViolation: (v: {
          rule: string;
          severity: 'critical' | 'error' | 'warning' | 'info';
          file: string;
          message: string;
        }) => void;
      }
    ).addViolation.bind(engine);
    addViolation({ rule: 'v1', severity: 'warning', file: domainFile, message: 'd' });
    addViolation({ rule: 'v2', severity: 'warning', file: appFile, message: 'a' });

    jest
      .spyOn(
        engine as unknown as { getAllTypeScriptFiles: () => Promise<string[]> },
        'getAllTypeScriptFiles'
      )
      .mockResolvedValue([domainFile, appFile, infraFile, apiFile]);
    jest
      .spyOn(
        engine as unknown as { getFileLayer: (file: string) => string },
        'getFileLayer'
      )
      .mockImplementation(file => {
        if (file.includes('/domain/')) return 'domain';
        if (file.includes('/application/')) return 'application';
        if (file.includes('/infrastructure/')) return 'infrastructure';
        if (file.includes('/api/')) return 'api';
        return 'unknown';
      });

    const metrics = await (
      engine as unknown as {
        calculateLayerMetrics: () => Promise<{
          domain: { files: number; dependencies: number; violations: number; compliance: number };
          application: { files: number; dependencies: number; violations: number; compliance: number };
          infrastructure: { files: number; dependencies: number; violations: number; compliance: number };
          api: { files: number; dependencies: number; violations: number; compliance: number };
        }>;
      }
    ).calculateLayerMetrics();

    expect(metrics.domain.files).toBe(1);
    expect(metrics.application.files).toBe(1);
    expect(metrics.infrastructure.files).toBe(1);
    expect(metrics.api.files).toBe(1);
    expect(metrics.domain.violations).toBe(1);
    expect(metrics.application.violations).toBe(1);
    expect(metrics.domain.compliance).toBe(90);
    expect(metrics.infrastructure.compliance).toBe(100);
  });

  it('recursively finds .ts files while skipping .d.ts and node_modules', async () => {
    const engine = new ArchitecturalAnalysisEngine(srcPath);
    writeFile(`${srcPath}/domain/a.ts`, `export const a = 1;`);
    writeFile(`${srcPath}/domain/b.d.ts`, `export type B = string;`);
    writeFile(`${srcPath}/node_modules/pkg/index.ts`, `export const p = 1;`);
    writeFile(`${srcPath}/application/c.ts`, `export const c = 1;`);

    const files = await (
      engine as unknown as { getAllTypeScriptFiles: () => Promise<string[]> }
    ).getAllTypeScriptFiles();
    const normalized = files.map(f => f.replace(/\\/g, '/'));

    expect(normalized).toEqual(
      expect.arrayContaining([`${srcPath}/domain/a.ts`, `${srcPath}/application/c.ts`])
    );
    expect(normalized.some(f => f.endsWith('/domain/b.d.ts'))).toBe(false);
    expect(normalized.some(f => f.includes('/node_modules/'))).toBe(false);
  });
});
