/**
 * Architectural Analysis Engine - Constitution Section 1: Architecture Constitution
 *
 * Constitution Section 1: Architecture Constitution - Automated governance and compliance monitoring
 * Constitution Section 2: Clean Architecture - Layer isolation and dependency rules
 * Constitution Section 3: Domain-Driven Design - Domain model integrity
 * Constitution Section 5: SOLID Principles - Design pattern compliance
 * Constitution Section 6: Testing Constitution - Test coverage and quality
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface ArchitecturalViolation {
  rule: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  constitutionSection?: string;
}

export interface AnalysisResult {
  summary: {
    totalFiles: number;
    violations: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    complianceScore: number;
  };
  violations: ArchitecturalViolation[];
  layerMetrics: {
    domain: LayerMetrics;
    application: LayerMetrics;
    infrastructure: LayerMetrics;
    api: LayerMetrics;
  };
  constitutionCompliance: {
    section1: boolean; // Architecture Constitution
    section2: boolean; // Clean Architecture
    section3: boolean; // Domain-Driven Design
    section5: boolean; // SOLID Principles
    section6: boolean; // Testing Constitution
  };
}

interface LayerMetrics {
  files: number;
  dependencies: number;
  violations: number;
  compliance: number;
}

export class ArchitecturalAnalysisEngine {
  private readonly srcPath: string;
  private violations: ArchitecturalViolation[] = [];

  constructor(srcPath: string = 'src') {
    this.srcPath = srcPath;
  }

  async analyze(): Promise<AnalysisResult> {
    this.violations = [];

    // Analyze file structure and dependencies
    await this.analyzeFileStructure();
    await this.analyzeDependencies();
    await this.analyzeLayerIsolation();
    await this.analyzeNamingConventions();
    await this.analyzeDesignPatterns();
    await this.analyzeTestCoverage();

    // Calculate metrics
    const files = await this.getAllTypeScriptFiles();
    const layerMetrics = await this.calculateLayerMetrics();

    // Check constitution compliance
    const constitutionCompliance = this.checkConstitutionCompliance();

    const summary = {
      totalFiles: files.length,
      violations: this.violations.length,
      critical: this.violations.filter(v => v.severity === 'critical').length,
      errors: this.violations.filter(v => v.severity === 'error').length,
      warnings: this.violations.filter(v => v.severity === 'warning').length,
      info: this.violations.filter(v => v.severity === 'info').length,
      complianceScore: this.calculateComplianceScore()
    };

    return {
      summary,
      violations: this.violations,
      layerMetrics,
      constitutionCompliance
    };
  }

  private async analyzeFileStructure(): Promise<void> {
    const files = await this.getAllTypeScriptFiles();

    for (const file of files) {
      // Check for files in wrong directories
      if (file.includes('/domain/') && file.includes('/infrastructure/')) {
        this.addViolation({
          rule: 'layer-isolation',
          severity: 'critical',
          file,
          message: 'Domain layer file found in infrastructure directory',
          suggestion: 'Move domain logic to appropriate domain directory',
          constitutionSection: '2'
        });
      }

      // Check for test files in wrong locations
      if (file.includes('__tests__') && !file.includes('/__tests__/')) {
        this.addViolation({
          rule: 'test-organization',
          severity: 'warning',
          file,
          message: 'Test file not in proper __tests__ directory',
          suggestion: 'Move test files to __tests__ directories',
          constitutionSection: '6'
        });
      }
    }
  }

  private async analyzeDependencies(): Promise<void> {
    const files = await this.getAllTypeScriptFiles();

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const imports = this.extractImports(content);
      const layer = this.getFileLayer(file);

      for (const imp of imports) {
        // Check Clean Architecture dependency rules
        if (layer === 'domain' && (imp.includes('/infrastructure/') || imp.includes('/api/'))) {
          this.addViolation({
            rule: 'dependency-direction',
            severity: 'critical',
            file,
            message: `Domain layer importing from ${imp.includes('/infrastructure/') ? 'infrastructure' : 'API'} layer`,
            suggestion: 'Domain layer should not depend on outer layers',
            constitutionSection: '2'
          });
        }

        if (layer === 'application' && imp.includes('/api/')) {
          this.addViolation({
            rule: 'dependency-direction',
            severity: 'error',
            file,
            message: 'Application layer importing from API layer',
            suggestion: 'Application layer should not depend on API layer',
            constitutionSection: '2'
          });
        }

        // Check for circular dependencies (simplified)
        if (imp.includes(file.replace('.ts', ''))) {
          this.addViolation({
            rule: 'circular-dependency',
            severity: 'error',
            file,
            message: 'Potential circular dependency detected',
            suggestion: 'Refactor to break circular dependency',
            constitutionSection: '2'
          });
        }
      }
    }
  }

  private async analyzeLayerIsolation(): Promise<void> {
    const files = await this.getAllTypeScriptFiles();

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const layer = this.getFileLayer(file);

      // Check for direct database access in domain layer
      if (layer === 'domain' && content.includes('database') || content.includes('prisma')) {
        this.addViolation({
          rule: 'infrastructure-leakage',
          severity: 'critical',
          file,
          message: 'Domain layer contains infrastructure concerns',
          suggestion: 'Move database access to infrastructure layer',
          constitutionSection: '2'
        });
      }

      // Check for business logic in infrastructure layer
      if (layer === 'infrastructure' && this.containsBusinessLogic(content)) {
        this.addViolation({
          rule: 'business-logic-leakage',
          severity: 'error',
          file,
          message: 'Infrastructure layer contains business logic',
          suggestion: 'Move business logic to domain layer',
          constitutionSection: '2'
        });
      }

      // Check for HTTP handling in domain layer
      if (layer === 'domain' && (content.includes('express') || content.includes('http'))) {
        this.addViolation({
          rule: 'framework-coupling',
          severity: 'error',
          file,
          message: 'Domain layer coupled to HTTP framework',
          suggestion: 'Use dependency injection and interfaces',
          constitutionSection: '2'
        });
      }
    }
  }

  private async analyzeNamingConventions(): Promise<void> {
    const files = await this.getAllTypeScriptFiles();

    for (const file of files) {
      const fileName = path.basename(file, '.ts');
      const layer = this.getFileLayer(file);

      // Domain layer naming
      if (layer === 'domain') {
        if (file.includes('/entities/') && !fileName.endsWith('.entity')) {
          this.addViolation({
            rule: 'naming-convention',
            severity: 'warning',
            file,
            message: 'Entity files should end with .entity.ts',
            suggestion: 'Rename file to follow naming convention',
            constitutionSection: '3'
          });
        }

        if (file.includes('/value-objects/') && !fileName.endsWith('.value-object')) {
          this.addViolation({
            rule: 'naming-convention',
            severity: 'warning',
            file,
            message: 'Value object files should end with .value-object.ts',
            suggestion: 'Rename file to follow naming convention',
            constitutionSection: '3'
          });
        }

        if (file.includes('/ports/') && !fileName.endsWith('.port')) {
          this.addViolation({
            rule: 'naming-convention',
            severity: 'warning',
            file,
            message: 'Port files should end with .port.ts',
            suggestion: 'Rename file to follow naming convention',
            constitutionSection: '2'
          });
        }
      }

      // Infrastructure layer naming
      if (layer === 'infrastructure') {
        if (file.includes('/repositories/') && !fileName.endsWith('.repository')) {
          this.addViolation({
            rule: 'naming-convention',
            severity: 'warning',
            file,
            message: 'Repository files should end with .repository.ts',
            suggestion: 'Rename file to follow naming convention',
            constitutionSection: '2'
          });
        }

        if (file.includes('/providers/') && !fileName.endsWith('.adapter')) {
          this.addViolation({
            rule: 'naming-convention',
            severity: 'warning',
            file,
            message: 'Provider files should end with .adapter.ts',
            suggestion: 'Rename file to follow naming convention',
            constitutionSection: '2'
          });
        }
      }
    }
  }

  private async analyzeDesignPatterns(): Promise<void> {
    const files = await this.getAllTypeScriptFiles();

    for (const file of files) {
      const content = await readFile(file, 'utf-8');

      // Check for SOLID principles violations
      if (this.hasLargeClass(content)) {
        this.addViolation({
          rule: 'single-responsibility',
          severity: 'warning',
          file,
          message: 'Class may violate Single Responsibility Principle',
          suggestion: 'Consider breaking down into smaller, focused classes',
          constitutionSection: '5'
        });
      }

      // Check for dependency injection usage
      if (this.getFileLayer(file) === 'application' && !content.includes('constructor') && content.includes('class')) {
        this.addViolation({
          rule: 'dependency-injection',
          severity: 'info',
          file,
          message: 'Application service may not use dependency injection',
          suggestion: 'Consider using constructor injection for dependencies',
          constitutionSection: '5'
        });
      }

      // Check for interface segregation
      if (content.includes('interface') && this.hasLargeInterface(content)) {
        this.addViolation({
          rule: 'interface-segregation',
          severity: 'warning',
          file,
          message: 'Interface may be too large, consider splitting',
          suggestion: 'Split large interfaces into smaller, focused ones',
          constitutionSection: '5'
        });
      }
    }
  }

  private async analyzeTestCoverage(): Promise<void> {
    const sourceFiles = await this.getAllTypeScriptFiles();
    const testFiles = sourceFiles.filter(f => f.includes('__tests__') || f.includes('.test.ts') || f.includes('.spec.ts'));

    // Check for missing tests
    for (const sourceFile of sourceFiles) {
      if (sourceFile.includes('__tests__') || sourceFile.includes('.test.') || sourceFile.includes('.spec.')) {
        continue; // Skip test files themselves
      }

      const testFile = sourceFile
        .replace('.ts', '.test.ts')
        .replace(/\/src\//, '/src/__tests__/')
        .replace(/\/([^\/]+)$/, '/__tests__/$1');

      const testExists = testFiles.some(tf =>
        tf.replace('.test.ts', '.ts').replace('/__tests__/', '/') === sourceFile ||
        tf.replace('/__tests__/', '/').replace('.test.ts', '.ts') === sourceFile
      );

      if (!testExists && !sourceFile.includes('/config/') && !sourceFile.includes('/types/')) {
        this.addViolation({
          rule: 'test-coverage',
          severity: 'warning',
          file: sourceFile,
          message: 'Source file missing corresponding test file',
          suggestion: 'Create comprehensive unit tests for this file',
          constitutionSection: '6'
        });
      }
    }

    // Check test file quality
    for (const testFile of testFiles) {
      const content = await readFile(testFile, 'utf-8');

      if (!content.includes('describe(')) {
        this.addViolation({
          rule: 'test-quality',
          severity: 'info',
          file: testFile,
          message: 'Test file missing proper test structure',
          suggestion: 'Use Jest describe/it blocks for organized tests',
          constitutionSection: '6'
        });
      }

      if (!content.includes('expect(')) {
        this.addViolation({
          rule: 'test-quality',
          severity: 'warning',
          file: testFile,
          message: 'Test file missing assertions',
          suggestion: 'Add proper assertions to validate behavior',
          constitutionSection: '6'
        });
      }
    }
  }

  private checkConstitutionCompliance(): AnalysisResult['constitutionCompliance'] {
    const criticalViolations = this.violations.filter(v => v.severity === 'critical');
    const errorViolations = this.violations.filter(v => v.severity === 'error');

    return {
      section1: criticalViolations.length === 0, // Architecture Constitution
      section2: !this.violations.some(v => v.constitutionSection === '2' && v.severity === 'critical'), // Clean Architecture
      section3: !this.violations.some(v => v.constitutionSection === '3' && v.severity !== 'info'), // Domain-Driven Design
      section5: !this.violations.some(v => v.constitutionSection === '5' && v.severity === 'error'), // SOLID Principles
      section6: !this.violations.some(v => v.constitutionSection === '6' && v.severity === 'error') // Testing Constitution
    };
  }

  private calculateComplianceScore(): number {
    const weights = { critical: 10, error: 5, warning: 2, info: 1 };
    const totalPenalty = this.violations.reduce((sum, v) => sum + weights[v.severity], 0);
    const maxPenalty = 100; // Arbitrary maximum

    return Math.max(0, Math.min(100, 100 - (totalPenalty / maxPenalty) * 100));
  }

  private async calculateLayerMetrics(): Promise<AnalysisResult['layerMetrics']> {
    const files = await this.getAllTypeScriptFiles();

    const metrics = {
      domain: { files: 0, dependencies: 0, violations: 0, compliance: 0 },
      application: { files: 0, dependencies: 0, violations: 0, compliance: 0 },
      infrastructure: { files: 0, dependencies: 0, violations: 0, compliance: 0 },
      api: { files: 0, dependencies: 0, violations: 0, compliance: 0 }
    };

    for (const file of files) {
      const layer = this.getFileLayer(file);
      if (layer in metrics) {
        metrics[layer as keyof typeof metrics].files++;

        const content = await readFile(file, 'utf-8');
        metrics[layer as keyof typeof metrics].dependencies += this.extractImports(content).length;
      }
    }

    // Calculate violations per layer
    for (const violation of this.violations) {
      const layer = this.getFileLayer(violation.file);
      if (layer in metrics) {
        metrics[layer as keyof typeof metrics].violations++;
      }
    }

    // Calculate compliance per layer
    for (const layer of Object.keys(metrics) as Array<keyof typeof metrics>) {
      const layerMetrics = metrics[layer];
      const violationPenalty = layerMetrics.violations * 10;
      layerMetrics.compliance = Math.max(0, 100 - violationPenalty);
    }

    return metrics;
  }

  private async getAllTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string): Promise<void> {
      const items = await readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemStat = await stat(fullPath);

        if (itemStat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await scan(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }

    await scan(this.srcPath);
    return files;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private getFileLayer(file: string): string {
    const relativePath = path.relative(this.srcPath, file);

    if (relativePath.includes('/domain/')) return 'domain';
    if (relativePath.includes('/application/')) return 'application';
    if (relativePath.includes('/infrastructure/')) return 'infrastructure';
    if (relativePath.includes('/api/')) return 'api';

    return 'unknown';
  }

  private containsBusinessLogic(content: string): boolean {
    const businessLogicPatterns = [
      /\bif\s*\([^)]*&&|==|!=|<|>|\|\|/,
      /\bfor\s*\(/,
      /\bwhile\s*\(/,
      /\bcalculate[A-Z]/,
      /\bvalidate[A-Z]/,
      /\bprocess[A-Z]/,
      /\brule[A-Z]/,
      /\bpolicy[A-Z]/
    ];

    return businessLogicPatterns.some(pattern => pattern.test(content));
  }

  private hasLargeClass(content: string): boolean {
    const classRegex = /class\s+\w+\s*{([^}]*)}/g;
    let match;
    let largestClassSize = 0;

    while ((match = classRegex.exec(content)) !== null) {
      const classContent = match[1];
      const lines = classContent.split('\n').length;
      largestClassSize = Math.max(largestClassSize, lines);
    }

    return largestClassSize > 50; // Arbitrary threshold
  }

  private hasLargeInterface(content: string): boolean {
    const interfaceRegex = /interface\s+\w+\s*{([^}]*)}/g;
    let match;
    let largestInterfaceSize = 0;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceContent = match[1];
      const methods = interfaceContent.split(';').length;
      largestInterfaceSize = Math.max(largestInterfaceSize, methods);
    }

    return largestInterfaceSize > 10; // Arbitrary threshold
  }

  private addViolation(violation: ArchitecturalViolation): void {
    this.violations.push(violation);
  }

  getViolations(): ArchitecturalViolation[] {
    return this.violations;
  }

  getViolationsBySeverity(severity: ArchitecturalViolation['severity']): ArchitecturalViolation[] {
    return this.violations.filter(v => v.severity === severity);
  }

  getConstitutionViolations(): ArchitecturalViolation[] {
    return this.violations.filter(v => v.constitutionSection);
  }
}

