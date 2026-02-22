#!/usr/bin/env node

/**
 * Professional Test Generator
 * Analyzes source code and generates comprehensive test files
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

class TestGenerator {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.servicePath = path.join(__dirname, '..', 'services', serviceName);
    this.srcPath = path.join(this.servicePath, 'src');
    this.testPath = path.join(this.servicePath, 'tests');
    this.generated = [];
  }

  async generate() {
    log.header(`Generating tests for: ${this.serviceName}`);

    if (!fs.existsSync(this.srcPath)) {
      throw new Error(`Source directory not found: ${this.srcPath}`);
    }

    // Ensure test directory exists
    if (!fs.existsSync(this.testPath)) {
      fs.mkdirSync(this.testPath, { recursive: true });
    }

    // Scan and generate tests
    await this.scanDirectory(this.srcPath);

    log.success(`Generated ${this.generated.length} test files`);
    this.generated.forEach(file => log.info(`  - ${file}`));

    return this.generated;
  }

  async scanDirectory(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory() && !['node_modules', 'tests', 'dist', 'coverage'].includes(entry.name)) {
        await this.scanDirectory(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        await this.generateTestForFile(fullPath, relPath);
      }
    }
  }

  async generateTestForFile(filePath, relativePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.ts');
    
    // Skip if test already exists
    const testFileName = `${fileName}.test.ts`;
    const testDir = path.join(this.testPath, path.dirname(relativePath));
    const testFilePath = path.join(testDir, testFileName);

    if (fs.existsSync(testFilePath)) {
      return; // Skip existing tests
    }

    // Analyze file type
    const fileType = this.detectFileType(content, fileName);
    if (!fileType) return; // Skip non-testable files

    // Generate test content
    const testContent = this.generateTestContent(content, fileName, relativePath, fileType);

    // Create test directory if needed
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Write test file
    fs.writeFileSync(testFilePath, testContent);
    this.generated.push(path.relative(this.servicePath, testFilePath));
  }

  detectFileType(content, fileName) {
    if (content.includes('extends Entity') || fileName.includes('.entity')) return 'entity';
    if (content.includes('extends ValueObject') || fileName.includes('.value-object')) return 'value-object';
    if (content.includes('class') && fileName.includes('.policy')) return 'policy';
    if (content.includes('class') && fileName.includes('.use-case')) return 'use-case';
    if (content.includes('class') && fileName.includes('.repository')) return 'repository';
    if (content.includes('class') && fileName.includes('.controller')) return 'controller';
    if (content.includes('class') && fileName.includes('.service')) return 'service';
    if (content.includes('class') && fileName.includes('.adapter')) return 'adapter';
    return null;
  }

  generateTestContent(content, fileName, relativePath, fileType) {
    const className = this.extractClassName(content);
    const importPath = `../${relativePath.replace(/\\/g, '/').replace('.ts', '')}`;

    const templates = {
      entity: this.generateEntityTest(className, importPath),
      'value-object': this.generateValueObjectTest(className, importPath),
      policy: this.generatePolicyTest(className, importPath),
      'use-case': this.generateUseCaseTest(className, importPath),
      repository: this.generateRepositoryTest(className, importPath),
      controller: this.generateControllerTest(className, importPath),
      service: this.generateServiceTest(className, importPath),
      adapter: this.generateAdapterTest(className, importPath)
    };

    return templates[fileType] || this.generateGenericTest(className, importPath);
  }

  extractClassName(content) {
    const match = content.match(/export\s+class\s+(\w+)/);
    return match ? match[1] : 'UnknownClass';
  }

  generateEntityTest(className, importPath) {
    return `import { ${className} } from '${importPath}';

describe('${className}', () => {
  describe('creation', () => {
    it('should create valid entity', () => {
      const data = {}; // TODO: Add valid data
      const entity = new ${className}(data);
      expect(entity).toBeDefined();
    });

    it('should reject invalid data', () => {
      const invalidData = {}; // TODO: Add invalid data
      expect(() => new ${className}(invalidData)).toThrow();
    });
  });

  describe('business logic', () => {
    it('should handle state transitions', () => {
      // TODO: Test entity behavior
    });
  });
});
`;
  }

  generateValueObjectTest(className, importPath) {
    return `import { ${className} } from '${importPath}';

describe('${className}', () => {
  describe('creation', () => {
    it('should create valid value object', () => {
      const data = {}; // TODO: Add valid data
      const vo = new ${className}(data);
      expect(vo).toBeDefined();
    });

    it('should enforce immutability', () => {
      const vo = new ${className}({});
      // TODO: Test immutability
    });
  });

  describe('equality', () => {
    it('should compare by value', () => {
      const vo1 = new ${className}({});
      const vo2 = new ${className}({});
      expect(vo1.equals(vo2)).toBe(true);
    });
  });
});
`;
  }

  generateUseCaseTest(className, importPath) {
    return `import { ${className} } from '${importPath}';

describe('${className}', () => {
  let useCase: ${className};
  let mockDependency: any;

  beforeEach(() => {
    mockDependency = { method: jest.fn() };
    useCase = new ${className}(mockDependency);
  });

  describe('execute', () => {
    it('should handle happy path', async () => {
      const input = {}; // TODO: Add input
      const result = await useCase.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle errors', async () => {
      mockDependency.method.mockRejectedValue(new Error('Test error'));
      await expect(useCase.execute({})).rejects.toThrow();
    });
  });
});
`;
  }

  generateRepositoryTest(className, importPath) {
    return `import { ${className} } from '${importPath}';

describe('${className}', () => {
  let repository: ${className};
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    repository = new ${className}(mockDb);
  });

  describe('CRUD operations', () => {
    it('should find by id', async () => {
      mockDb.findOne.mockResolvedValue({ id: '1' });
      const result = await repository.findById('1');
      expect(result).toBeDefined();
    });

    it('should save entity', async () => {
      const entity = {}; // TODO: Add entity
      await repository.save(entity);
      expect(mockDb.save).toHaveBeenCalled();
    });
  });
});
`;
  }

  generateGenericTest(className, importPath) {
    return `import { ${className} } from '${importPath}';

describe('${className}', () => {
  it('should be defined', () => {
    expect(${className}).toBeDefined();
  });

  // TODO: Add specific tests
});
`;
  }

  generatePolicyTest(className, importPath) {
    return this.generateGenericTest(className, importPath);
  }

  generateControllerTest(className, importPath) {
    return this.generateGenericTest(className, importPath);
  }

  generateServiceTest(className, importPath) {
    return this.generateGenericTest(className, importPath);
  }

  generateAdapterTest(className, importPath) {
    return this.generateGenericTest(className, importPath);
  }
}

// CLI
const serviceName = process.argv[2];

if (!serviceName) {
  console.error('Usage: node generate-tests.js <service-name>');
  process.exit(1);
}

const generator = new TestGenerator(serviceName);
generator.generate().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
