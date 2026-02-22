#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const log = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  header: (msg) => console.log(`\n\x1b[1m\x1b[36m${msg}\x1b[0m\n`)
};

class TurboTestGenerator {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.servicePath = path.join(__dirname, '..', 'services', serviceName);
    this.srcPath = path.join(this.servicePath, 'src');
    this.testPath = path.join(this.servicePath, 'tests');
    this.stats = { generated: 0, skipped: 0, errors: 0 };
  }

  async generate() {
    log.header(`🚀 TURBO TEST GENERATOR: ${this.serviceName}`);

    if (!fs.existsSync(this.srcPath)) {
      throw new Error(`Source not found: ${this.srcPath}`);
    }

    fs.mkdirSync(this.testPath, { recursive: true });
    await this.scanAndGenerate(this.srcPath);

    log.success(`Generated: ${this.stats.generated} | Skipped: ${this.stats.skipped}`);
    return this.stats;
  }

  async scanAndGenerate(dir, rel = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(rel, entry.name);

      if (entry.isDirectory() && !['node_modules', 'tests', 'dist'].includes(entry.name)) {
        await this.scanAndGenerate(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        await this.generateTest(fullPath, relPath);
      }
    }
  }

  async generateTest(filePath, relPath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.ts');
    const testFile = path.join(this.testPath, path.dirname(relPath), `${fileName}.test.ts`);

    if (fs.existsSync(testFile)) {
      this.stats.skipped++;
      return;
    }

    const analysis = this.analyzeCode(content, fileName);
    if (!analysis) {
      this.stats.skipped++;
      return;
    }

    const testContent = this.buildTest(analysis, relPath);
    const testDir = path.dirname(testFile);
    
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFile, testContent);
    
    this.stats.generated++;
    log.info(`Generated: ${path.relative(this.servicePath, testFile)}`);
  }

  analyzeCode(content, fileName) {
    const classes = this.extractClasses(content);
    const functions = this.extractFunctions(content);
    const imports = this.extractImports(content);
    
    if (classes.length === 0 && functions.length === 0) return null;

    const type = this.detectType(content, fileName);
    return { classes, functions, imports, type, fileName };
  }

  extractClasses(content) {
    const regex = /export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*{([^}]*)}/gs;
    const classes = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const [, name, parent, interfaces, body] = match;
      const methods = this.extractMethods(body);
      const props = this.extractProperties(body);
      classes.push({ name, parent, interfaces, methods, props });
    }

    return classes;
  }

  extractMethods(body) {
    const regex = /(async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
    const methods = [];
    let match;

    while ((match = regex.exec(body)) !== null) {
      const [, isAsync, name] = match;
      if (!['constructor', 'get', 'set'].includes(name)) {
        methods.push({ name, isAsync: !!isAsync });
      }
    }

    return methods;
  }

  extractProperties(body) {
    const regex = /(?:private|public|protected)?\s+(\w+)(?:\?)?:\s*([^;=]+)/g;
    const props = [];
    let match;

    while ((match = regex.exec(body)) !== null) {
      props.push({ name: match[1], type: match[2].trim() });
    }

    return props;
  }

  extractFunctions(content) {
    const regex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    const functions = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  }

  extractImports(content) {
    const regex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      imports.push({ items: match[1].trim(), from: match[2] });
    }

    return imports;
  }

  detectType(content, fileName) {
    const patterns = {
      entity: /extends\s+Entity|\.entity\./,
      valueObject: /extends\s+ValueObject|value-object/,
      useCase: /UseCase|use-case/,
      repository: /Repository|repository/,
      controller: /Controller|controller/,
      service: /Service(?!\.)/,
      policy: /Policy|policy/,
      saga: /Saga|saga/,
      adapter: /Adapter|adapter/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content) || pattern.test(fileName)) return type;
    }

    return 'generic';
  }

  buildTest(analysis, relPath) {
    const { classes, type, fileName } = analysis;
    const importPath = `../src/${relPath.replace(/\\/g, '/').replace('.ts', '')}`;
    
    const generators = {
      entity: () => this.genEntityTest(classes[0], importPath),
      valueObject: () => this.genValueObjectTest(classes[0], importPath),
      useCase: () => this.genUseCaseTest(classes[0], importPath),
      repository: () => this.genRepositoryTest(classes[0], importPath),
      controller: () => this.genControllerTest(classes[0], importPath),
      service: () => this.genServiceTest(classes[0], importPath),
      policy: () => this.genPolicyTest(classes[0], importPath),
      saga: () => this.genSagaTest(classes[0], importPath),
      adapter: () => this.genAdapterTest(classes[0], importPath),
      generic: () => this.genGenericTest(classes[0] || { name: fileName }, importPath)
    };

    return generators[type]();
  }

  genEntityTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  describe('creation', () => {
    it('should create with valid data', () => {
      const data = { id: '1' };
      const entity = ${cls.name}.create(data);
      expect(entity).toBeDefined();
      expect(entity.id).toBe('1');
    });

    it('should validate required fields', () => {
      expect(() => ${cls.name}.create({})).toThrow();
    });
  });

  describe('business rules', () => {
${cls.methods.map(m => `    it('should ${m.name}', ${m.isAsync ? 'async ' : ''}() => {
      const entity = ${cls.name}.create({ id: '1' });
      ${m.isAsync ? 'await ' : ''}entity.${m.name}();
      expect(entity).toBeDefined();
    });`).join('\n\n')}
  });
});
`;
  }

  genValueObjectTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  it('should create valid value object', () => {
    const vo = new ${cls.name}('test-value');
    expect(vo).toBeDefined();
  });

  it('should be immutable', () => {
    const vo = new ${cls.name}('test');
    expect(() => { (vo as any).value = 'new'; }).toThrow();
  });

  it('should compare by value', () => {
    const vo1 = new ${cls.name}('test');
    const vo2 = new ${cls.name}('test');
    expect(vo1.equals(vo2)).toBe(true);
  });
});
`;
  }

  genUseCaseTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let useCase: ${cls.name};
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    useCase = new ${cls.name}(mockRepo);
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      const result = await useCase.execute({ id: '1' });
      expect(result).toBeDefined();
    });

    it('should handle not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(useCase.execute({ id: '999' })).rejects.toThrow();
    });

    it('should handle repository errors', async () => {
      mockRepo.findById.mockRejectedValue(new Error('DB error'));
      await expect(useCase.execute({ id: '1' })).rejects.toThrow();
    });
  });
});
`;
  }

  genRepositoryTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let repository: ${cls.name};
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    repository = new ${cls.name}(mockDb);
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      mockDb.findUnique.mockResolvedValue({ id: '1', name: 'Test' });
      const result = await repository.findById('1');
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
    });

    it('should return null when not found', async () => {
      mockDb.findUnique.mockResolvedValue(null);
      const result = await repository.findById('999');
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save entity', async () => {
      const entity = { id: '1', name: 'Test' };
      mockDb.create.mockResolvedValue(entity);
      await repository.save(entity);
      expect(mockDb.create).toHaveBeenCalledWith({ data: entity });
    });
  });
});
`;
  }

  genControllerTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';
import { Request, Response } from 'express';

describe('${cls.name}', () => {
  let controller: ${cls.name};
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new ${cls.name}(mockUseCase);
    req = { params: {}, body: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

${cls.methods.map(m => `  describe('${m.name}', () => {
    it('should handle request successfully', async () => {
      mockUseCase.execute.mockResolvedValue({ success: true });
      await controller.${m.name}(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Test error'));
      await controller.${m.name}(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });`).join('\n\n')}
});
`;
  }

  genServiceTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let service: ${cls.name};

  beforeEach(() => {
    service = new ${cls.name}();
  });

${cls.methods.map(m => `  describe('${m.name}', () => {
    it('should ${m.name} successfully', ${m.isAsync ? 'async ' : ''}() => {
      const result = ${m.isAsync ? 'await ' : ''}service.${m.name}();
      expect(result).toBeDefined();
    });
  });`).join('\n\n')}
});
`;
  }

  genPolicyTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let policy: ${cls.name};

  beforeEach(() => {
    policy = new ${cls.name}();
  });

  describe('evaluate', () => {
    it('should allow valid operations', () => {
      const result = policy.evaluate({ valid: true });
      expect(result).toBe(true);
    });

    it('should deny invalid operations', () => {
      const result = policy.evaluate({ valid: false });
      expect(result).toBe(false);
    });
  });
});
`;
  }

  genSagaTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let saga: ${cls.name};
  let mockEventBus: any;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    saga = new ${cls.name}(mockEventBus);
  });

  describe('execute', () => {
    it('should complete saga successfully', async () => {
      await saga.execute({ id: '1' });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
      mockEventBus.publish.mockRejectedValue(new Error('Failure'));
      await expect(saga.execute({ id: '1' })).rejects.toThrow();
    });
  });
});
`;
  }

  genAdapterTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  let adapter: ${cls.name};

  beforeEach(() => {
    adapter = new ${cls.name}();
  });

${cls.methods.map(m => `  describe('${m.name}', () => {
    it('should adapt data correctly', ${m.isAsync ? 'async ' : ''}() => {
      const input = { test: 'data' };
      const result = ${m.isAsync ? 'await ' : ''}adapter.${m.name}(input);
      expect(result).toBeDefined();
    });
  });`).join('\n\n')}
});
`;
  }

  genGenericTest(cls, importPath) {
    return `import { ${cls.name} } from '${importPath}';

describe('${cls.name}', () => {
  it('should be defined', () => {
    expect(${cls.name}).toBeDefined();
  });
});
`;
  }
}

const serviceName = process.argv[2];
if (!serviceName) {
  console.error('Usage: node turbo-test-generator.js <service-name>');
  process.exit(1);
}

const generator = new TurboTestGenerator(serviceName);
generator.generate().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
