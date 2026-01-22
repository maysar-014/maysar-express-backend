# Testing Constitution

> **Purpose**: This document is the binding testing law for all services in this platform.  
> **Goal**: Enforce meaningful test coverage, validate business logic, and ensure quality through **Domain-First Testing + Coverage Truth**.

---

## 1. Core Philosophy

**Tests must validate reality.**  
**Coverage must reflect truth.**  
**Mocks must never deceive.**

Any testing approach that produces false confidence is forbidden.

---

## 2. The Coverage Truth Principle (CTP)

> **Tests must execute actual source code.**  
> **Coverage reports must show real business logic execution.**  
> **Mock implementations are forbidden in test files.**

Violation of this principle produces misleading metrics and false security.

---

## 3. Domain Purity Testing Law (Non‑Negotiable)

### 3.1 Domain Test Isolation Rule
- Domain tests import only domain code
- No infrastructure, framework, or external dependencies
- No environment variables, databases, or network calls

**Domain tests must compile and run without any external setup.**

### 3.2 Business Logic Validation Rule

Domain tests must prove:
- Business rules execute correctly
- Invariants are maintained
- Edge cases are handled
- Calculations are accurate

**If business logic changes, domain tests must fail.**

---

## 4. Layer Testing Sovereignty Model

Each architectural layer has prescribed testing patterns.

```
Domain → Application → Infrastructure → API
Unit Tests → Integration Tests → E2E Tests
```

### Layer Testing Responsibilities

| Layer | Test Focus | Forbidden Patterns |
|-----|------------|-------------------|
| Domain | Pure business logic | External dependencies |
| Application | Use cases & Sagas | Database calls |
| Infrastructure | Adapters & ports | Business decisions |
| API | End-to-end flows | Complex mocking |

---

## 5. Mock Constitution (Non‑Negotiable)

### 5.1 Mock Forbidden Zone Rule

**Mock classes are forbidden in test files.**  
**Mock implementations of business logic are forbidden.**

Allowed mocking:
- External APIs
- Databases
- File systems
- Message brokers

Forbidden mocking:
- Domain entities
- Value objects
- Business rules
- Algorithms

### 5.2 Test Import Law

> **Tests must import actual implementations.**  
> **Only external dependencies may be mocked.**

Example:
```typescript
// ✅ CORRECT
import { Product } from '../entities/product.entity';
import { Price } from '../value-objects/monetary.value-object';

// ❌ FORBIDDEN
class Product { ... } // Mock in test file
```

---

## 6. Coverage Constitution

### 6.1 Coverage Truth Verification Rule

Coverage reports must satisfy:
- Source files appear in coverage reports
- Coverage percentages reflect actual execution
- No mock code appears in coverage
- Business logic lines are covered

**0% coverage on source files indicates test failure.**

### 6.2 Coverage Targets Mandate

| Component Type | Minimum Coverage | Critical Threshold |
|---------------|------------------|-------------------|
| Domain Entities | 90% | 95% |
| Value Objects | 95% | 98% |
| Engines | 85% | 90% |
| Policies | 90% | 95% |
| Algorithms | 95% | 98% |
| Use Cases | 80% | 85% |
| Sagas | 85% | 90% |
| Infrastructure | 70% | 75% |
| API Controllers | 70% | 75% |

### 6.3 Coverage Quality Rule

Coverage must include:
- Statement coverage (business logic execution)
- Branch coverage (decision paths)
- Function coverage (method execution)

**High coverage with poor quality is forbidden.**

---

## 7. Test Organization Mandate

### 7.1 File Structure Law

Tests MUST mirror source structure:

```
src/
 ├── domain/
 │    ├── entities/
 │    │    └── __tests__/
 │    │        └── product.entity.test.ts
 │    ├── value-objects/
 │    │    └── __tests__/
 │    │        └── pricing.test.ts
 │    └── engines/
 │        └── __tests__/
 │            └── pricing-engine.test.ts
 │
 ├── application/
 │    ├── use-cases/
 │    │    └── __tests__/
 │    │        └── create-product.use-case.test.ts
 │    └── sagas/
 │        └── __tests__/
 │            └── order-fulfillment.saga.test.ts
 │
 └── api/
     ├── controllers/
     │    └── __tests__/
     │        └── product.controller.test.ts
     └── routes/
         └── __tests__/
             └── product.routes.test.ts
```

### 7.2 Test Naming Convention Rule

```
describe('ComponentName', () => {
  describe('Behavior Category', () => {
    it('should achieve specific outcome', () => {
      // Test implementation
    });
  });
});
```

Example:
```typescript
describe('Price Value Object', () => {
  describe('Creation', () => {
    it('should create valid price', () => {
      // Test
    });
  });
});
```

---

## 8. Test Quality Constitution

### 8.1 Test Isolation Rule

Each test must be:
- Independent (no shared state)
- Deterministic (same result every run)
- Fast (sub-second execution)
- Focused (single responsibility)

**Flaky tests are forbidden.**

### 8.2 Test Data Management Rule

Test data must be:
- Realistic (reflects production data)
- Minimal (only required fields)
- Varied (covers edge cases)
- Isolated (no test interference)

**Magic numbers and unrealistic data are forbidden.**

### 8.3 Assertion Completeness Rule

Tests must verify:
- Expected outcomes
- Error conditions
- Edge cases
- Business invariants

**Tests that only check "no error thrown" are insufficient.**

---

## 9. Saga Testing Constitution

### 9.1 Saga Test Scope Rule

Saga tests must validate:
- Step execution order
- Compensation logic
- Error handling
- State transitions

**Saga tests must mock all external calls.**

### 9.2 Compensation Completeness Verification Rule

Every saga test must prove:
- Happy path execution
- Compensation on failure
- Partial failure handling
- Idempotency

**Uncompensated saga steps are forbidden.**

---

## 10. Integration Testing Law

### 10.1 Integration Test Scope Rule

Integration tests validate:
- Infrastructure adapter correctness
- Repository operations
- External service integration
- End-to-end workflows

**Integration tests may use real infrastructure components.**

### 10.2 Test Environment Consistency Rule

Integration tests must run in:
- Isolated environments
- Realistic configurations
- Clean state per test
- Parallel execution safe

**Shared test databases are forbidden.**

---

## 11. Test Automation Constitution

### 11.1 CI/CD Coverage Enforcement Rule

> **Coverage regressions block deployments.**  
> **Test failures block deployments.**  
> **Manual test approval is forbidden.**

### 11.2 Coverage Report Standards Rule

Coverage reports must include:
- File-by-file breakdown
- Uncovered line identification
- Trend analysis
- Quality gates

**Coverage reports must be accessible to all developers.**

---

## 12. Test Maintenance Law

### 12.1 Test Debt Prohibition Rule

> **Broken tests must be fixed immediately.**  
> **Outdated tests must be updated on code changes.**  
> **Test technical debt accumulates interest.**

### 12.2 Test Review Mandate

All test changes require:
- Code review
- Coverage verification
- Performance validation
- Maintainability assessment

**Test changes bypass code review at peril.**

---

## 13. Test Documentation Constitution

### 13.1 Test Documentation Requirements Rule

Tests must be documented with:
- Business context
- Test scenarios
- Edge case reasoning
- Failure diagnostics

**Undocumented tests are maintenance liabilities.**

### 13.2 Test README Mandate

Every test directory must contain:
- Test organization explanation
- Setup requirements
- Execution instructions
- Troubleshooting guide

---

## 14. Anti-Pattern Constitution (Forbidden)

### 14.1 Mock Business Logic Prohibition
```typescript
// ❌ FORBIDDEN
class Product {
  constructor(public id: string, public name: string) {}
  isValid() { return true; }
}
```

### 14.2 Test-Only Production Code Prohibition
```typescript
// ❌ FORBIDDEN
if (process.env.NODE_ENV === 'test') {
  // Special test behavior
}
```

### 14.3 Coverage Gaming Prohibition
```typescript
// ❌ FORBIDDEN
it('should increase coverage', () => {
  // Meaningless assertions
  expect(true).toBe(true);
});
```

### 14.4 Slow Test Tolerance Prohibition
Tests exceeding 1 second are automatically failed.

### 14.5 Test Data Hardcoding Prohibition
```typescript
// ❌ FORBIDDEN
const testUser = { id: '123', name: 'Test' };
```

---

## 15. Testing Tool Constitution

### 15.1 Approved Testing Stack Rule

| Purpose | Tool | Justification |
|---------|------|---------------|
| Test Framework | Jest | Fast, feature-rich, TypeScript support |
| Assertion Library | Jest expect | Consistent with framework |
| Mocking | Jest mocks | Built-in, powerful |
| Coverage | Istanbul (Jest) | Industry standard |
| E2E | Playwright/Cypress | Modern, reliable |

### 15.2 Configuration Standardization Rule

All services must use:
- Consistent Jest configuration
- Standard coverage thresholds
- Unified test scripts
- Common setup/teardown patterns

---

## 16. Test Performance Constitution

### 16.1 Test Execution Speed Law

| Test Type | Max Duration | Enforcement |
|-----------|-------------|-------------|
| Unit Tests | 100ms | Automatic failure |
| Integration Tests | 2s | Warning at 1s |
| E2E Tests | 30s | Warning at 15s |

### 16.2 Test Parallelization Mandate

Tests must support:
- Parallel execution
- Random order execution
- Isolated resource usage
- Fast feedback cycles

---

## 17. Test Debugging Constitution

### 17.1 Test Failure Analysis Rule

Failed tests require:
- Root cause identification
- Fix implementation
- Regression prevention
- Documentation update

**Test failures without fixes are forbidden.**

### 17.2 Test Debugging Tools Mandate

Developers must use:
- Debug mode execution
- Step-through debugging
- Coverage analysis
- Performance profiling

---

## 18. Legacy Test Migration Law

### 18.1 Mock-Based Test Elimination Rule

All tests with mock business logic must be:
- Identified within 30 days
- Migrated within 90 days
- Verified for coverage truth

**Mock-based tests found after deadline are deleted.**

### 18.2 Coverage Baseline Establishment Rule

Current coverage levels must be:
- Measured accurately
- Baselines established
- Improvement targets set
- Progress tracked weekly

---

## 19. Testing Culture Constitution

### 19.1 Developer Testing Responsibility Rule

> **Every developer is a testing expert.**  
> **Every code change includes tests.**  
> **Testing quality is personal responsibility.**

### 19.2 Testing Education Mandate

All developers must complete:
- Testing fundamentals training
- Domain testing patterns
- Coverage analysis skills
- Test debugging mastery

---

## 20. The Final Testing Law

> **If tests don't validate reality, development has failed.**  
> **If coverage doesn't reflect truth, quality assurance has failed.**  
> **If mocks deceive confidence, the testing constitution has failed.**

This document is binding for all current and future tests.

---

## Appendix A: Test Constitution Violations

### Critical Violations (Block Deployment)
- Mock business logic in test files
- 0% coverage on source files
- Tests not importing real implementations
- Coverage gaming attempts

### Major Violations (Require Fix)
- Slow tests (>1s unit, >30s e2e)
- Non-deterministic test results
- Missing edge case coverage
- Poor test documentation

### Minor Violations (Code Review Fix)
- Inconsistent naming conventions
- Missing test organization
- Unclear test assertions
- Incomplete test data

---

## Appendix B: Testing Constitution Checklist

### Pre-Commit Checklist
- [ ] All tests pass
- [ ] Coverage meets thresholds
- [ ] No mock business logic
- [ ] Tests import real implementations
- [ ] Domain tests are pure

### Code Review Checklist
- [ ] Test structure follows conventions
- [ ] Coverage quality is verified
- [ ] Edge cases are covered
- [ ] Test performance is acceptable
- [ ] Documentation is complete

### Deployment Checklist
- [ ] Coverage regression check passes
- [ ] No failing tests in pipeline
- [ ] Coverage reports are generated
- [ ] Quality gates are satisfied

---

**End of Testing Constitution**

---

**This constitution ensures that testing validates reality, coverage reflects truth, and quality is never compromised. All software engineers must follow these laws without exception.**
