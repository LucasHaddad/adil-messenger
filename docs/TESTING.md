# Testing Guide

This document provides comprehensive information about testing in the Adil Messenger API project.

## 📋 Table of Contents

- [Test Structure](#test-structure)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## 🏗️ Test Structure

```
├── src/
│   ├── **/*.spec.ts           # Unit tests (co-located with source)
│   └── test/
│       ├── setup.ts           # Jest setup configuration
│       ├── test-utils.ts      # Test utilities and mocks
│       └── test-helpers.ts    # Advanced testing helpers
├── test/
│   ├── *.e2e-spec.ts         # End-to-end tests
│   ├── jest-e2e.json         # E2E Jest configuration
│   └── setup-e2e.ts          # E2E test setup
├── coverage/                  # Coverage reports (generated)
└── test-runner.sh            # Custom test runner script
```

## 🧪 Test Types

### 1. Unit Tests (`*.spec.ts`)

**Purpose**: Test individual components in isolation

**Location**: `src/**/*.spec.ts`

**Features**:
- Mock all dependencies
- Fast execution
- High coverage targeting (80%+)
- Test business logic and edge cases

**Example**:
```typescript
describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: createMockRepository() }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests

**Purpose**: Test component interactions with real/mock services

**Features**:
- Test module interactions
- Database integration (with test DB)
- Service layer testing
- Mock external dependencies only

### 3. End-to-End Tests (`*.e2e-spec.ts`)

**Purpose**: Test complete user workflows through HTTP API

**Location**: `test/*.e2e-spec.ts`

**Features**:
- Full application testing
- Real HTTP requests
- Database integration
- User scenario simulation

**Example**:
```typescript
describe('Message workflow (e2e)', () => {
  it('should complete full message lifecycle', async () => {
    // Create user -> Create message -> Update -> Reply -> Delete
  });
});
```

## 🚀 Running Tests

### Quick Commands

```bash
# Run all unit tests
yarn test:unit

# Run with coverage
yarn test:cov

# Run in watch mode
yarn test:watch

# Run specific test file
yarn test user.service.spec.ts

# Run E2E tests
yarn test:e2e

# Run all tests with coverage
yarn test:ci
```

### Advanced Test Runner

Use the custom test runner for more options:

```bash
# Basic unit tests
./test-runner.sh

# All tests including integration and E2E
./test-runner.sh --all

# Skip linting, run with coverage
./test-runner.sh --no-lint

# Watch mode for development
./test-runner.sh --watch

# Run without stopping on failures
./test-runner.sh --no-bail

# Show help
./test-runner.sh --help
```

### Environment Setup

For integration and E2E tests, ensure PostgreSQL is running:

```bash
# Using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# Or using docker-compose
docker-compose up -d postgres

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export DB_DATABASE=adil_messenger_test
```

## ✍️ Writing Tests

### Test Utilities

The project provides several utilities to make testing easier:

#### Mock Factories
```typescript
import { createMockUser, createMockMessage } from '../test/test-utils';

const user = createMockUser({ username: 'custom' });
const message = createMockMessage({ content: 'test' });
```

#### Repository Mocks
```typescript
import { RepositoryMockBuilder } from '../test/test-helpers';

const mockRepo = new RepositoryMockBuilder<User>()
  .findOneReturns(testUser)
  .saveReturns(testUser)
  .build();
```

#### Error Assertions
```typescript
import { ErrorAssertions } from '../test/test-helpers';

try {
  await service.methodThatShouldFail();
} catch (error) {
  ErrorAssertions.expectNotFoundException(error, 'User not found');
}
```

#### Performance Testing
```typescript
import { PerformanceTestUtils } from '../test/test-helpers';

const { result, duration } = await PerformanceTestUtils.measureExecutionTime(
  () => service.expensiveOperation()
);

PerformanceTestUtils.expectExecutionTime(duration, 1000); // Max 1 second
```

### Testing Patterns

#### 1. Service Testing Pattern
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let repository: jest.Mocked<Repository<Entity>>;

  beforeEach(async () => {
    // Setup test module
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(expectedEntity);
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(repository.findOne).toHaveBeenCalledWith(expectedQuery);
      expect(result).toEqual(expectedResult);
    });

    it('should handle error case', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### 2. Controller Testing Pattern
```typescript
describe('ControllerName', () => {
  let controller: ControllerName;
  let service: jest.Mocked<ServiceName>;

  beforeEach(async () => {
    // Setup with mocked service
  });

  it('should delegate to service and return result', async () => {
    // Arrange
    service.method.mockResolvedValue(expectedResult);
    
    // Act
    const result = await controller.method(input);
    
    // Assert
    expect(service.method).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedResult);
  });
});
```

#### 3. E2E Testing Pattern
```typescript
describe('Feature (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Setup test application
  });

  afterEach(async () => {
    await app.close();
  });

  it('should complete workflow', async () => {
    // Step 1: Create resource
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/resource')
      .send(createDto)
      .expect(201);

    // Step 2: Use resource
    await request(app.getHttpServer())
      .get(`/api/v1/resource/${createResponse.body.id}`)
      .expect(200);
  });
});
```

## 📊 Coverage

### Coverage Targets

- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Terminal**: Real-time coverage summary
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

### Viewing Coverage

```bash
# Generate and view coverage
yarn test:cov

# Open HTML report (macOS)
open coverage/lcov-report/index.html

# Open HTML report (Linux)
xdg-open coverage/lcov-report/index.html
```

### Coverage Configuration

Coverage settings in `package.json`:

```json
{
  "jest": {
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.d.ts",
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/*.interface.ts",
      "!**/index.ts",
      "!**/main.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline (`.github/workflows/ci.yml`):

1. **Lint**: Code style and formatting checks
2. **Unit Tests**: Fast, isolated component tests
3. **Integration Tests**: Component interaction tests
4. **E2E Tests**: Full application workflow tests
5. **Security Audit**: Dependency vulnerability scanning
6. **Build**: Application compilation
7. **Docker**: Container build and test

### Workflow Triggers

- **Push**: `main`, `develop` branches
- **Pull Request**: `main`, `develop` branches

### Status Checks

All tests must pass before merging:
- ✅ Linting
- ✅ Unit tests (80%+ coverage)
- ✅ Integration tests
- ✅ E2E tests
- ✅ Security audit
- ✅ Build success

## 📋 Best Practices

### 1. Test Organization

- **Co-locate unit tests** with source files
- **Use descriptive test names** that explain the scenario
- **Group related tests** using `describe` blocks
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Test Data

- **Use factories** for consistent test data
- **Create minimal test data** for each test
- **Avoid shared mutable state** between tests
- **Clean up after tests** in integration/E2E tests

### 3. Mocking Strategy

- **Mock external dependencies** (databases, APIs, file system)
- **Use real implementations** for business logic under test
- **Prefer dependency injection** for easier mocking
- **Reset mocks** between tests

### 4. Assertions

- **Be specific** in assertions
- **Test both success and failure** scenarios
- **Verify side effects** (database calls, events)
- **Use custom matchers** for domain-specific assertions

### 5. Performance

- **Keep unit tests fast** (< 100ms each)
- **Limit E2E test scope** to critical user journeys
- **Parallelize when possible**
- **Use test databases** for integration tests

### 6. Maintenance

- **Update tests with code changes**
- **Refactor tests** when they become hard to understand
- **Remove obsolete tests**
- **Keep test utilities up to date**

## 🐛 Debugging Tests

### Common Issues

1. **Mock not working**: Ensure proper module mocking
2. **Async timing**: Use proper async/await patterns
3. **Database state**: Clean up between integration tests
4. **Environment variables**: Set test-specific configuration

### Debugging Commands

```bash
# Debug specific test
yarn test:debug user.service.spec.ts

# Run single test with verbose output
yarn test user.service.spec.ts --verbose

# Run with coverage and open report
yarn test:cov && open coverage/lcov-report/index.html
```

### IDE Integration

Most IDEs support Jest debugging. Configure your IDE to:
- Run individual tests
- Set breakpoints in test files
- Debug test failures
- View coverage inline

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeORM Testing](https://typeorm.io/testing)