/**
 * E2E Jest setup: runs in each worker before tests.
 * Ensures ENVIRONMENT=test and DATABASE_URL point to the test database
 * so the app (when created in tests) uses ticketshubtest.
 */
process.env.ENVIRONMENT = 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://ticketshub:ticketshub@localhost:5433/ticketshubtest';
}

jest.setTimeout(30000);
