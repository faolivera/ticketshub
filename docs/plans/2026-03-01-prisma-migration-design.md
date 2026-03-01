# JSON to PostgreSQL + Prisma Migration Design

## Overview

Migrate all 16 repositories from JSON file storage (`KeyValueFileStorage`) to PostgreSQL using Prisma ORM.

## Goals

1. Replace JSON file persistence with PostgreSQL
2. Introduce repository interfaces for better testability and flexibility
3. Maintain existing API contracts (services unchanged)
4. Set up Docker-based local development environment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Services                              │
│  (UsersService, EventsService, TicketsService, etc.)        │
└─────────────────────────┬───────────────────────────────────┘
                          │ depends on
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Interfaces                     │
│  (IUsersRepository, IEventsRepository, etc.)                │
│  Location: src/modules/{domain}/{domain}.repository.interface.ts │
└─────────────────────────┬───────────────────────────────────┘
                          │ implemented by
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Prisma Repositories                         │
│  (UsersRepository, EventsRepository, etc.)                  │
│  Location: src/modules/{domain}/{domain}.repository.ts      │
└─────────────────────────┬───────────────────────────────────┘
                          │ uses
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     PrismaService                            │
│  Location: src/common/prisma/prisma.service.ts              │
└─────────────────────────┬───────────────────────────────────┘
                          │ connects to
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│  (Docker container via docker-compose.yaml)                 │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
ticketshub/
├── docker-compose.yaml                # PostgreSQL container
├── backend/
│   ├── .env                           # DATABASE_URL
│   ├── prisma/
│   │   └── schema.prisma              # All Prisma models
│   └── src/
│       ├── common/
│       │   └── prisma/
│       │       ├── prisma.module.ts   # Global Prisma module
│       │       └── prisma.service.ts  # PrismaClient wrapper
│       └── modules/
│           └── {domain}/
│               ├── {domain}.repository.interface.ts  # Interface
│               ├── {domain}.repository.ts            # Prisma implementation
│               └── {domain}.module.ts                # DI configuration
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interface location | Same folder as repository | Co-location for discoverability |
| Prisma schema | Single file | ~20 models, manageable in one file |
| PrismaService | Global module | Shared connection pool |
| ID strategy | String IDs (UUID) | Matches existing domain models |
| Enums | Prisma native enums | Type safety, maps to TypeScript |
| JSON fields | Prisma `Json` type | For nested objects (addresses, etc.) |

## Repositories to Migrate

| # | Module | Repository | Entities | Complexity |
|---|--------|------------|----------|------------|
| 1 | users | UsersRepository | User | Medium |
| 2 | events | EventsRepository | Event, EventDate, EventSection | High |
| 3 | tickets | TicketsRepository | TicketListing, TicketUnit | High |
| 4 | transactions | TransactionsRepository | Transaction | Medium |
| 5 | notifications | NotificationsRepository | Notification, NotificationEvent, etc. | High |
| 6 | payments | PaymentsRepository | Payment | Medium |
| 7 | payments/pricing | PricingRepository | PricingSnapshot | Low |
| 8 | payment-methods | PaymentMethodsRepository | PaymentMethod | Low |
| 9 | payment-confirmations | PaymentConfirmationsRepository | PaymentConfirmation | Low |
| 10 | wallet | WalletRepository | Wallet, WalletTransaction | Medium |
| 11 | reviews | ReviewsRepository | Review | Low |
| 12 | terms | TermsRepository | TermsVersion, UserTermsState, etc. | Low |
| 13 | otp | OtpRepository | Otp | Low |
| 14 | identity-verification | IdentityVerificationRepository | IdentityVerification | Low |
| 15 | support | SupportRepository | SupportTicket | Low |
| 16 | images | ImagesRepository | Image | Low |

## Interface Pattern

Each repository will have an interface extracted from its current public methods:

```typescript
// users.repository.interface.ts
export interface IUsersRepository {
  getAll(ctx: Ctx): Promise<User[]>;
  findById(ctx: Ctx, id: string): Promise<User | undefined>;
  findByEmail(ctx: Ctx, email: string): Promise<User | undefined>;
  add(ctx: Ctx, user: CreateUserData): Promise<User>;
  // ... all other public methods
}

export const USERS_REPOSITORY = Symbol('IUsersRepository');
```

```typescript
// users.repository.ts
@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}
  // ... implementations
}
```

```typescript
// users.module.ts
@Module({
  providers: [
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
    UsersService,
  ],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
```

## Prisma Schema (High-Level)

Key models and their relationships:

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  firstName         String
  lastName          String
  role              Role
  level             UserLevel
  status            UserStatus
  // ... other fields
  
  // Relations
  tickets           TicketListing[]
  events            Event[]
  transactions      Transaction[]
  reviews           Review[]
}

model Event {
  id          String      @id @default(uuid())
  name        String
  venue       String
  status      EventStatus
  createdBy   String
  creator     User        @relation(fields: [createdBy], references: [id])
  
  // Relations
  dates       EventDate[]
  sections    EventSection[]
  tickets     TicketListing[]
}

model TicketListing {
  id            String        @id @default(uuid())
  eventId       String
  event         Event         @relation(fields: [eventId], references: [id])
  sellerId      String
  seller        User          @relation(fields: [sellerId], references: [id])
  status        ListingStatus
  
  // Nested units stored as JSON or separate table
  ticketUnits   TicketUnit[]
}
```

## Environment Variables

```env
# backend/.env
DATABASE_URL="postgresql://ticketshub:ticketshub@localhost:5432/ticketshub?schema=public"
```

## Docker Compose

```yaml
# docker-compose.yaml (project root)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ticketshub
      POSTGRES_PASSWORD: ticketshub
      POSTGRES_DB: ticketshub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Migration Strategy

1. **Infrastructure first**: Docker + Prisma setup
2. **Schema creation**: Define all Prisma models
3. **Common layer**: PrismaService + PrismaModule
4. **Repository by repository**: Extract interface → Implement with Prisma → Update module DI
5. **Cleanup**: Remove JSON storage code and data files

## Testing Considerations

- Interfaces enable easy mocking in unit tests
- Integration tests can use Prisma's test utilities or testcontainers
- Existing service tests should continue to work with mocked repositories

## Rollback Plan

Since this is a fresh start (no data migration), rollback is straightforward:
- Revert code changes
- Remove docker-compose and prisma folders
- Restore original repository implementations from git

## Success Criteria

- [ ] All 16 repositories migrated to Prisma
- [ ] All existing service methods work unchanged
- [ ] Docker Compose starts PostgreSQL successfully
- [ ] `prisma migrate dev` runs without errors
- [ ] Application starts and basic flows work
