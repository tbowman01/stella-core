# ArcQubit Test Suite

Comprehensive test suite for the ArcQubit Knowledge Work Platform.

## Overview

The test suite includes:
- **Unit Tests**: Testing individual functions and modules
- **Integration Tests**: Testing interactions between components
- **E2E Tests**: Testing complete user workflows (Playwright)

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run E2E tests only
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

```
test/
├── setup.ts              # Global test setup
├── utils.ts              # Test utilities and factories
└── utils.test.ts         # Tests for test utilities

packages/
├── shared/
│   └── src/
│       └── utils.test.ts # Unit tests for shared utilities
├── auth/
│   └── src/
│       ├── password.test.ts  # Password hashing tests
│       ├── jwt.test.ts       # JWT token tests
│       └── rbac.test.ts      # Role-based access control tests
├── cache/
│   └── src/
│       ├── cache.test.ts     # Cache functionality tests
│       └── rate-limit.test.ts # Rate limiting tests
└── plugins/
    └── src/
        └── manager.test.ts   # Plugin manager tests
```

## Coverage Goals

Target coverage metrics:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

## Writing Tests

### Test File Naming

- Unit tests: `[module].test.ts`
- Integration tests: `[feature].integration.test.ts`
- E2E tests: `[workflow].spec.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow();
    });
  });
});
```

### Using Test Utilities

```typescript
import {
  createMockTenant,
  createMockUser,
  createMockDocument,
  createMockWorkspace,
} from '../../test/utils';

describe('My Test', () => {
  it('should work with mock data', () => {
    const tenant = createMockTenant({ name: 'Custom Tenant' });
    const user = createMockUser({ role: 'admin' });
    const document = createMockDocument({ classification: 'confidential' });

    // Use mock objects in tests
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('@arcqubit/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock a function
const mockFn = vi.fn(async () => 'result');

// Verify calls
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('arg');
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

it('should handle async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message');
});
```

## Test Coverage Report

After running `npm run test:coverage`, view the report:

```bash
# Text summary in terminal
# HTML report in coverage/index.html
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Continuous Integration

Tests run automatically on:
- Every commit
- Pull requests
- Before deployment

GitHub Actions workflow: `.github/workflows/test.yml`

## Test Data

### Mock Factories

Test utilities provide factories for creating mock data:

- `createMockTenant()` - Create tenant object
- `createMockUser()` - Create user object
- `createMockDocument()` - Create document object
- `createMockWorkspace()` - Create workspace object

All factories accept overrides:

```typescript
const user = createMockUser({
  email: 'custom@example.com',
  role: 'admin',
});
```

### Database Testing

For tests requiring database access:

```typescript
import { cleanupDatabase, seedTestData } from '../../test/utils';

describe('Database Tests', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  it('should query database', async () => {
    // Test with real database
  });
});
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

✅ Good:
```typescript
it('should return null when user does not exist')
it('should hash password with bcrypt')
it('should reject passwords shorter than 12 characters')
```

❌ Bad:
```typescript
it('works')
it('test 1')
it('should work correctly')
```

### 2. Arrange-Act-Assert

Structure tests with clear sections:

```typescript
it('should calculate total', () => {
  // Arrange
  const items = [1, 2, 3];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(6);
});
```

### 3. One Assertion Per Test

Prefer focused tests with single assertions:

✅ Good:
```typescript
it('should validate email format', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});

it('should reject invalid email', () => {
  expect(validateEmail('invalid')).toBe(false);
});
```

❌ Bad:
```typescript
it('should validate emails', () => {
  expect(validateEmail('test@example.com')).toBe(true);
  expect(validateEmail('invalid')).toBe(false);
  expect(validateEmail('')).toBe(false);
});
```

### 4. Test Edge Cases

Always test edge cases and error conditions:

```typescript
describe('divide', () => {
  it('should divide positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should handle decimal results', () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 5. Mock External Dependencies

Always mock external dependencies:

```typescript
// ❌ Bad - depends on real database
it('should create user', async () => {
  const user = await createUser({ email: 'test@example.com' });
  expect(user).toBeDefined();
});

// ✅ Good - mocks database
vi.mock('@arcqubit/database');

it('should create user', async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
  prisma.user.create = mockCreate;

  const user = await createUser({ email: 'test@example.com' });

  expect(mockCreate).toHaveBeenCalled();
  expect(user.id).toBe('123');
});
```

### 6. Clean Up After Tests

Always clean up side effects:

```typescript
describe('File Operations', () => {
  const testFile = '/tmp/test.txt';

  afterEach(async () => {
    // Clean up test file
    await fs.unlink(testFile);
  });

  it('should create file', async () => {
    await createFile(testFile, 'content');
    expect(await fileExists(testFile)).toBe(true);
  });
});
```

## Debugging Tests

### Run Single Test

```bash
# Run specific test file
npx vitest run packages/auth/src/password.test.ts

# Run tests matching pattern
npx vitest run -t "password"
```

### Debug Mode

```bash
# Run with node inspector
node --inspect-brk node_modules/.bin/vitest run

# Then attach debugger in VSCode or Chrome DevTools
```

### Verbose Output

```bash
# Show detailed output
npm run test:unit
```

## Performance

### Slow Tests

If tests are slow:
1. Mock expensive operations (database, network)
2. Use `beforeAll` instead of `beforeEach` when possible
3. Parallelize independent tests
4. Consider using test.concurrent for parallel execution

```typescript
import { describe, it, expect, test } from 'vitest';

describe('Parallel Tests', () => {
  test.concurrent('test 1', async () => {
    // Independent test
  });

  test.concurrent('test 2', async () => {
    // Independent test
  });
});
```

## Troubleshooting

### Tests Hanging

- Check for unresolved promises
- Ensure async functions use `await`
- Check for infinite loops
- Increase test timeout in vitest.config.ts

### Flaky Tests

- Avoid timing-dependent tests
- Mock date/time functions
- Ensure proper test isolation
- Check for race conditions

### Import Errors

- Verify path aliases in vitest.config.ts
- Check tsconfig.json paths
- Ensure all dependencies installed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain coverage above thresholds
4. Add integration tests for new APIs
5. Update this documentation if needed
