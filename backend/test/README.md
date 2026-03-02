# Test Directory Structure

```
test/
├── unit/           # Unit tests (mocked dependencies)
│   ├── common/     # Tests for common utilities
│   └── modules/    # Tests for module services
├── integration/    # Integration tests (real database)
│   └── (empty)     # TODO: Add repository integration tests
├── e2e/            # End-to-end tests (full app)
│   └── *.e2e-spec.ts
├── jest-e2e.json
├── jest-integration.json
└── README.md
```

## Running Tests

```bash
# Unit tests only (default)
npm test
npm run test:unit

# E2E tests
npm run test:e2e

# Integration tests (requires database)
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Test Types

### Unit Tests (`test/unit/`)
- Mock all external dependencies (repositories, services, etc.)
- Fast execution, no database required
- Focus on business logic in services
- **Limitation**: Cannot catch raw SQL errors (column names, syntax)

### Integration Tests (`test/integration/`)
- Run against a real test database
- Test repository implementations with actual SQL
- Catch raw SQL errors that unit tests miss
- Slower execution

### E2E Tests (`test/e2e/`)
- Test complete HTTP flows
- Full application bootstrap
- Real database interactions
- Slowest execution, highest confidence

## Adding New Tests

- Unit tests: `test/unit/modules/<module>/<service>.spec.ts`
- Integration tests: `test/integration/modules/<module>/<repository>.spec.ts`
- E2E tests: `test/e2e/<feature>.e2e-spec.ts`
