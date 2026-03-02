# Test Directory Structure

```
test/
├── unit/           # Unit tests (mocked dependencies)
│   ├── common/     # Tests for common utilities
│   └── modules/    # Tests for module services
├── integration/    # Integration tests (real database)
│   ├── setup/      # Global setup, teardown, test utilities
│   └── modules/    # Repository integration tests per module
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
- Run against a real test database (`ticketshubtest` on the same PostgreSQL as dev)
- Test repository implementations with actual SQL
- Catch raw SQL errors that unit tests miss
- Slower execution

**Prerequisites:**
- Docker Compose Postgres running: `docker-compose up -d postgres`
- Database runs on port 5433 (default)

**Setup:**
- **Global setup** (once before all tests): Drops and recreates `ticketshubtest`, runs Prisma migrations
- **Before each test**: All tables are truncated so each test starts with an empty database
- Tests use `getTestPrismaClient()` and `truncateAllTables()` from `test/integration/setup/`

**Adding a new repository integration test:**
- Create `test/integration/modules/<module>/<repository>.spec.ts`
- Use `beforeAll` to get Prisma client and instantiate the repository
- Use `beforeEach` to call `truncateAllTables(prisma)` and `createTestContext()`
- Use `afterAll` to call `disconnectTestPrisma()`

### E2E Tests (`test/e2e/`)
- Test complete HTTP flows
- Full application bootstrap
- Real database interactions
- Slowest execution, highest confidence

## Adding New Tests

- Unit tests: `test/unit/modules/<module>/<service>.spec.ts`
- Integration tests: `test/integration/modules/<module>/<repository>.spec.ts`
- E2E tests: `test/e2e/<feature>.e2e-spec.ts`
