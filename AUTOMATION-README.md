# Test Coverage Automation Scripts

Professional automation tools for achieving 95% test coverage across all microservices.

## 🚀 Quick Start

### Phase 2 Complete Automation (Recommended)
```bash
# Windows
run-phase2.bat

# Unix/Linux/Mac
./run-phase2.sh
```

This single command will:
- ✅ Verify all 4 Phase 2 services
- ✅ Run tests with coverage in parallel
- ✅ Generate JSON and Markdown reports
- ✅ Show detailed summary with metrics

## 📋 Available Scripts

### 1. Phase Automation (Master Script)
**Location:** `scripts/phase-automation.js`

Complete automation for any phase with parallel execution.

```bash
node scripts/phase-automation.js 2  # Phase 2
node scripts/phase-automation.js 3  # Phase 3
```

**Features:**
- Parallel test execution (3 services at a time)
- Automatic coverage verification
- JSON + Markdown reports
- Colored console output
- Error handling and recovery

**Output:**
- `PHASE2-AUTOMATION-REPORT.json` - Detailed JSON report
- `PHASE2-AUTOMATION-REPORT.md` - Human-readable markdown

### 2. Coverage Verification
**Location:** `scripts/verify-coverage.js`

Focused coverage verification with detailed metrics.

```bash
node scripts/verify-coverage.js
```

**Features:**
- Service-by-service verification
- Coverage breakdown (statements, branches, functions, lines)
- Target comparison
- JSON report generation

### 3. Test Generator
**Location:** `scripts/generate-tests.js`

Auto-generate test scaffolds from source code.

```bash
node scripts/generate-tests.js <service-name>
```

**Example:**
```bash
node scripts/generate-tests.js inventory-service
```

**Features:**
- Analyzes source code structure
- Detects file types (entity, use-case, repository, etc.)
- Generates appropriate test templates
- Skips existing tests

## 📊 Reports

### JSON Report Structure
```json
{
  "phase": 2,
  "timestamp": "2025-01-XX",
  "duration": "45.2s",
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0,
    "successRate": "100%"
  },
  "passed": [...],
  "failed": [...]
}
```

### Markdown Report
- Summary table with all metrics
- Passed services with coverage breakdown
- Failed services with gaps and errors
- Easy to share and review

## 🎯 Phase 2 Services

| Service | Target | Tests Created |
|---------|--------|---------------|
| inventory-service | 95% | 7 files |
| compliance-service | 95% | 5 files |
| session-service | 95% | 4 files |
| maps-service | 90% | 4 files |

**Total:** 20 test files

## ⚡ Performance

- **Parallel Execution:** 3 services simultaneously
- **Average Duration:** 30-60 seconds for Phase 2
- **Memory Efficient:** Streams output, minimal memory footprint

## 🔧 Configuration

### Modify Phase Services
Edit `scripts/phase-automation.js`:

```javascript
const phases = {
  2: [
    { name: 'inventory-service', target: 95 },
    { name: 'compliance-service', target: 95 },
    // Add more services...
  ]
};
```

### Adjust Parallel Execution
```javascript
const maxParallel = 3; // Change to 2, 4, etc.
```

## 📝 Manual Commands

If you prefer manual execution:

```bash
# Individual service
cd services/inventory-service
npm test -- --coverage --watchAll=false

# All Phase 2 services
cd services/inventory-service && npm test -- --coverage --watchAll=false
cd services/compliance-service && npm test -- --coverage --watchAll=false
cd services/session-service && npm test -- --coverage --watchAll=false
cd services/maps-service && npm test -- --coverage --watchAll=false
```

## ✅ Success Criteria

Phase 2 is complete when:
- ✅ All 4 services pass tests
- ✅ Coverage meets targets (95% or 90%)
- ✅ No test failures
- ✅ Reports generated successfully

## 🐛 Troubleshooting

### Tests not found
```bash
# Verify test files exist
dir services\inventory-service\tests /s
```

### Coverage not generated
```bash
# Check jest.config.js exists
type services\inventory-service\jest.config.js
```

### Script errors
```bash
# Ensure Node.js is installed
node --version  # Should be 14+
```

## 🚀 Next Steps

After Phase 2 completion:

1. Review reports: `PHASE2-AUTOMATION-REPORT.md`
2. Fix any failed services
3. Commit changes
4. Proceed to Phase 3:
   ```bash
   node scripts/phase-automation.js 3
   ```

## 📈 Future Phases

The automation scripts support all phases:

- **Phase 2:** 4 services (zero-test services)
- **Phase 3:** 11 services (minimal coverage)
- **Phase 4:** 5 services (medium coverage)
- **Phase 5:** 6 services (excellent coverage)

Simply run: `node scripts/phase-automation.js <phase-number>`

## 🎉 Benefits

- **10x Faster:** Automated vs manual execution
- **Consistent:** Same process every time
- **Reliable:** Error handling and recovery
- **Transparent:** Detailed reports and logs
- **Scalable:** Works for any number of services

---

**Created for:** Maysar Express Backend - 95% Coverage Initiative
**Version:** 1.0.0
**Last Updated:** 2025-01-XX
