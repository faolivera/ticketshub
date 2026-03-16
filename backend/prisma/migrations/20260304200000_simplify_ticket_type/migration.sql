-- Step 1: Add the new Digital enum value only.
-- PostgreSQL requires this to be committed before the new value can be used in UPDATE.
-- The data migration and column drops are in the next migration.
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'Digital';
