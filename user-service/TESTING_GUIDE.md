# User Service Testing Guide

## Overview

The User Service implements comprehensive testing across all layers of the application. This guide explains the testing strategy, how to write tests, and how to maintain high code quality.

Testing is not an afterthought—it's integral to the development process. Tests serve multiple purposes: they verify correctness, document behavior, enable refactoring, and catch regressions.

---

## Testing Philosophy

### Test Pyramid

The User Service follows the test pyramid principle:

```
        /\
       /  \  E2E Tests (10%)
      /    \
     /------\
    /        \  Integration Tests (30%)
   /          \
  /------------\
 /              \ Unit Tests (60%)
/________________\
```

**Unit Tests** (60%): Test individual components in isolation
- Fast execution
- No external dependencies
- High coverage
- Easy to debug

**Integration Tests** (30%): Test component interactions
- Moderate execution speed
- Limited external dependencies
- Medium coverage
- Test realistic scenarios

**E2E Tests** (10%): Test complete workflows
- Slow execution
- Full external dependencies
- Low coverage
- Test user-facing behavior

### Coverage Targets

The User Service maintains comprehensive test coverage:

| Layer | Minimum | Target | Critical |
|-------|---------|--------|----------|
| Domain | 90% | 95% | 98% |
| Application | 85% | 90% | 95% |
| Infrastructure | 75% | 80% | 85% |
| API | 80% | 85% | 90% |

---

## Unit Testing

### Domain Layer Tests

Domain layer tests verify business logic in isolation:

```typescript
describe('User Entity', () => {
  it('should create a user with valid data', () => {
    const user = User.create({
      email: new Email('user@example.com'),
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: new PhoneNumber('+255712345678'),
      role: 'buyer'
    });

    expect(user.getEmail().getValue()).toBe('user@example.com');
    expect(user.getFirstName()).toBe('John');
  });

  it('should throw error for invalid email', () => {
    expect(() => {
      User.create({
        email: new Email('invalid-email'),
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: new PhoneNumber('+255712345678'),
        role: 'buyer'
      });
    }).toThrow(InvalidEmailFormatError);
  });
});
```

### Value Object Tests

Value object tests verify encapsulated validation:

```typescript
describe('Email Value Object', () => {
  it('should create valid email', () => {
    const email = new Email('user@example.com');
    expect(email.getValue()).toBe('user@example.com');
  });

  it('should reject invalid format', () => {
    expect(() => new Email('invalid-email')).toThrow(InvalidEmailFormatError);
  });
});
```

---

## Integration Testing

### Use Case Tests

Use case tests verify orchestration of domain logic:

```typescript
describe('Create User Use Case', () => {
  let useCase: CreateUserUseCase;
  let userRepository: MockUserRepository;
  let eventPublisher: MockEventPublisher;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    eventPublisher = new MockEventPublisher();
    useCase = new CreateUserUseCase(userRepository, eventPublisher);
  });

  it('should create user successfully', async () => {
    const input = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+255712345678',
      password: 'SecurePassword123!',
      role: 'buyer'
    };

    const result = await useCase.execute(input);

    expect(result.userId).toBeDefined();
    expect(result.email).toBe('user@example.com');
  });
});
```

---

## API Testing

### Controller Tests

Controller tests verify HTTP request handling:

```typescript
describe('User Controller', () => {
  let controller: UserController;
  let createUserUseCase: MockCreateUserUseCase;

  beforeEach(() => {
    createUserUseCase = new MockCreateUserUseCase();
    controller = new UserController(createUserUseCase);
  });

  it('should create user and return 201', async () => {
    const req = { body: { email: 'user@example.com', firstName: 'John' } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});
```

---

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/domain/entities/user.entity.test.ts

# Run in watch mode
npm run test:watch
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## Best Practices

### Test Organization

- One test file per source file
- Descriptive test names
- Arrange-Act-Assert pattern
- Group related tests with describe blocks

### Test Data

- Use factory functions for test data
- Keep test data minimal
- Use realistic but simple values
- Avoid test interdependencies

### Mocking

- Mock external dependencies
- Never mock the code under test
- Use realistic mock behavior
- Verify mock interactions

---

## Conclusion

Comprehensive testing ensures the User Service remains reliable, maintainable, and correct. By following this testing guide and maintaining high coverage, you can confidently deploy changes and catch regressions early.
