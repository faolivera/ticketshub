# JSON to PostgreSQL + Prisma Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all 16 repositories from JSON file storage to PostgreSQL using Prisma ORM with proper interfaces.

**Architecture:** Repository interfaces extracted from current implementations, Prisma implementations injected via NestJS DI. PrismaService as global singleton. Docker Compose for local PostgreSQL.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL 16, Docker Compose, TypeScript

---

## Task 1: Infrastructure Setup (Docker + Prisma)

**Files:**
- Create: `docker-compose.yaml` (project root)
- Create: `backend/.env`
- Create: `backend/prisma/schema.prisma`
- Modify: `backend/package.json`
- Modify: `backend/.gitignore`

**Step 1: Create docker-compose.yaml**

```yaml
# docker-compose.yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ticketshub-db
    environment:
      POSTGRES_USER: ticketshub
      POSTGRES_PASSWORD: ticketshub
      POSTGRES_DB: ticketshub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ticketshub"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Step 2: Create backend/.env**

```env
DATABASE_URL="postgresql://ticketshub:ticketshub@localhost:5432/ticketshub?schema=public"
```

**Step 3: Update backend/.gitignore**

Add to the file:
```
.env
```

**Step 4: Install Prisma dependencies**

Run: `cd backend && npm install prisma @prisma/client`

**Step 5: Initialize Prisma**

Run: `cd backend && npx prisma init`

This creates `prisma/schema.prisma`. We'll replace its content in the next task.

**Step 6: Start PostgreSQL**

Run: `docker compose up -d`
Expected: Container `ticketshub-db` running on port 5432

**Step 7: Commit**

```bash
git add docker-compose.yaml backend/.env backend/.gitignore backend/package.json backend/package-lock.json backend/prisma
git commit -m "feat: add docker-compose and prisma setup for postgresql migration"
```

---

## Task 2: Create Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Write the complete Prisma schema**

Replace the content of `backend/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// ENUMS
// =============================================================================

enum Role {
  User
  Admin
}

enum UserStatus {
  Enabled
  Disabled
  Suspended
}

enum UserLevel {
  Basic
  Buyer
  Seller
  VerifiedSeller
}

enum Language {
  es
  en
}

enum IdentityVerificationStatus {
  pending
  approved
  rejected
}

enum EventStatus {
  pending
  approved
  rejected
}

enum EventDateStatus {
  pending
  approved
  rejected
  cancelled
}

enum EventSectionStatus {
  pending
  approved
  rejected
}

enum EventCategory {
  Concert
  Sports
  Theater
  Festival
  Conference
  Comedy
  Other
}

enum TicketType {
  Physical
  DigitalTransferable
  DigitalNonTransferable
}

enum DeliveryMethod {
  Pickup
  ArrangeWithSeller
}

enum ListingStatus {
  Pending
  Active
  Sold
  Cancelled
  Expired
}

enum TicketUnitStatus {
  available
  reserved
  sold
}

enum SeatingType {
  numbered
  unnumbered
}

enum TransactionStatus {
  PendingPayment
  PaymentPendingVerification
  PaymentReceived
  TicketTransferred
  Completed
  Disputed
  Refunded
  Cancelled
}

enum RequiredActor {
  Buyer
  Seller
  Platform
  None
}

enum CancellationReason {
  BuyerCancelled
  PaymentFailed
  PaymentTimeout
  AdminRejected
  AdminReviewTimeout
}

enum PaymentIntentStatus {
  pending
  processing
  succeeded
  failed
  cancelled
}

enum PaymentConfirmationStatus {
  pending
  approved
  rejected
}

enum WalletTransactionType {
  credit
  debit
  pending_credit
  pending_release
  payout
}

enum OTPType {
  email_verification
  phone_verification
  password_reset
}

enum OTPStatus {
  pending
  verified
  expired
}

enum SupportTicketStatus {
  open
  in_progress
  waiting_for_customer
  resolved
  closed
}

enum SupportTicketCategory {
  transaction
  account
  technical
  other
}

enum SupportMessageSender {
  user
  admin
}

enum ReviewRole {
  buyer
  seller
}

enum TermsUserType {
  buyer
  seller
}

enum TermsStatus {
  draft
  active
  archived
}

enum NotificationEventType {
  PAYMENT_REQUIRED
  BUYER_PAYMENT_SUBMITTED
  BUYER_PAYMENT_APPROVED
  BUYER_PAYMENT_REJECTED
  TICKET_TRANSFERRED
  TRANSACTION_COMPLETED
  TRANSACTION_CANCELLED
  TRANSACTION_EXPIRED
  DISPUTE_OPENED
  DISPUTE_RESOLVED
  IDENTITY_VERIFIED
  IDENTITY_REJECTED
  EVENT_APPROVED
  EVENT_REJECTED
  REVIEW_RECEIVED
}

enum NotificationChannel {
  IN_APP
  EMAIL
}

enum NotificationEventStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum NotificationStatus {
  PENDING
  QUEUED
  SENT
  DELIVERED
  FAILED
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

// =============================================================================
// MODELS
// =============================================================================

model User {
  id                    String     @id @default(uuid())
  email                 String     @unique
  firstName             String
  lastName              String
  role                  Role       @default(User)
  level                 UserLevel  @default(Basic)
  status                UserStatus @default(Enabled)
  publicName            String
  imageId               String?
  phone                 String?
  password              String
  country               String     @default("Germany")
  currency              String     @default("EUR")
  language              Language   @default(en)
  address               Json?
  emailVerified         Boolean    @default(false)
  phoneVerified         Boolean    @default(false)
  tosAcceptedAt         DateTime?
  identityVerification  Json?
  bankAccount           Json?
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  // Relations
  createdEvents         Event[]         @relation("EventCreator")
  approvedEvents        Event[]         @relation("EventApprover")
  createdDates          EventDate[]     @relation("DateCreator")
  approvedDates         EventDate[]     @relation("DateApprover")
  createdSections       EventSection[]  @relation("SectionCreator")
  approvedSections      EventSection[]  @relation("SectionApprover")
  listings              TicketListing[]
  buyerTransactions     Transaction[]   @relation("TransactionBuyer")
  sellerTransactions    Transaction[]   @relation("TransactionSeller")
  wallet                Wallet?
  reviewsGiven          Review[]        @relation("ReviewReviewer")
  reviewsReceived       Review[]        @relation("ReviewReviewee")
  supportTickets        SupportTicket[]
  otps                  Otp[]
  identityVerifications IdentityVerificationRequest[]
  notifications         Notification[]

  @@map("users")
}

model Image {
  id          String   @id @default(uuid())
  filename    String
  contentType String
  sizeBytes   Int
  width       Int?
  height      Int?
  uploadedBy  String
  uploadedAt  DateTime @default(now())

  @@map("images")
}

model Event {
  id              String        @id @default(uuid())
  name            String
  description     String
  category        EventCategory
  venue           String
  location        Json
  imageIds        String[]
  banners         Json?
  status          EventStatus   @default(pending)
  rejectionReason String?
  createdById     String
  approvedById    String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  createdBy       User          @relation("EventCreator", fields: [createdById], references: [id])
  approvedBy      User?         @relation("EventApprover", fields: [approvedById], references: [id])
  dates           EventDate[]
  sections        EventSection[]
  listings        TicketListing[]

  @@map("events")
}

model EventDate {
  id              String          @id @default(uuid())
  eventId         String
  date            DateTime
  status          EventDateStatus @default(pending)
  rejectionReason String?
  createdById     String
  approvedById    String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  event           Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdBy       User            @relation("DateCreator", fields: [createdById], references: [id])
  approvedBy      User?           @relation("DateApprover", fields: [approvedById], references: [id])
  listings        TicketListing[]

  @@map("event_dates")
}

model EventSection {
  id              String             @id @default(uuid())
  eventId         String
  name            String
  seatingType     SeatingType
  status          EventSectionStatus @default(pending)
  rejectionReason String?
  createdById     String
  approvedById    String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  // Relations
  event           Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdBy       User               @relation("SectionCreator", fields: [createdById], references: [id])
  approvedBy      User?              @relation("SectionApprover", fields: [approvedById], references: [id])
  listings        TicketListing[]

  @@unique([eventId, name])
  @@map("event_sections")
}

model TicketListing {
  id              String        @id @default(uuid())
  sellerId        String
  eventId         String
  eventDateId     String
  eventSectionId  String
  type            TicketType
  ticketUnits     Json
  sellTogether    Boolean       @default(false)
  pricePerTicket  Json
  deliveryMethod  DeliveryMethod?
  pickupAddress   Json?
  description     String?
  status          ListingStatus @default(Pending)
  expiresAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  seller          User          @relation(fields: [sellerId], references: [id])
  event           Event         @relation(fields: [eventId], references: [id])
  eventDate       EventDate     @relation(fields: [eventDateId], references: [id])
  eventSection    EventSection  @relation(fields: [eventSectionId], references: [id])
  transactions    Transaction[]

  @@map("ticket_listings")
}

model Transaction {
  id                        String            @id @default(uuid())
  listingId                 String
  buyerId                   String
  sellerId                  String
  ticketType                TicketType
  ticketUnitIds             String[]
  quantity                  Int
  ticketPrice               Json
  buyerPlatformFee          Json
  sellerPlatformFee         Json
  paymentMethodCommission   Json
  totalPaid                 Json
  sellerReceives            Json
  pricingSnapshotId         String
  status                    TransactionStatus @default(PendingPayment)
  requiredActor             RequiredActor     @default(Buyer)
  paymentExpiresAt          DateTime
  adminReviewExpiresAt      DateTime?
  deliveryMethod            DeliveryMethod?
  pickupAddress             Json?
  eventDateTime             DateTime?
  releaseAfterMinutes       Int?
  autoReleaseAt             DateTime?
  disputeId                 String?
  paymentMethodId           String?
  paymentConfirmationId     String?
  paymentApprovedBy         String?
  paymentApprovedAt         DateTime?
  cancelledBy               RequiredActor?
  cancellationReason        CancellationReason?
  paymentReceivedAt         DateTime?
  ticketTransferredAt       DateTime?
  buyerConfirmedAt          DateTime?
  completedAt               DateTime?
  cancelledAt               DateTime?
  refundedAt                DateTime?
  createdAt                 DateTime          @default(now())
  updatedAt                 DateTime          @updatedAt

  // Relations
  listing                   TicketListing     @relation(fields: [listingId], references: [id])
  buyer                     User              @relation("TransactionBuyer", fields: [buyerId], references: [id])
  seller                    User              @relation("TransactionSeller", fields: [sellerId], references: [id])
  paymentIntent             PaymentIntent?
  paymentConfirmation       PaymentConfirmation?
  reviews                   Review[]

  @@map("transactions")
}

model PaymentIntent {
  id                String              @id @default(uuid())
  transactionId     String              @unique
  amount            Json
  status            PaymentIntentStatus @default(pending)
  provider          String
  providerPaymentId String?
  metadata          Json?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  transaction       Transaction         @relation(fields: [transactionId], references: [id])

  @@map("payment_intents")
}

model PaymentMethod {
  id                  String   @id @default(uuid())
  name                String
  type                String
  status              String   @default("enabled")
  commissionPercent   Float
  commissionFixed     Int      @default(0)
  instructions        Json?
  requiredFields      String[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("payment_methods")
}

model PaymentConfirmation {
  id                  String                    @id @default(uuid())
  transactionId       String                    @unique
  paymentMethodId     String
  uploadedBy          String
  status              PaymentConfirmationStatus @default(pending)
  imageIds            String[]
  fields              Json?
  reviewedBy          String?
  reviewedAt          DateTime?
  rejectionReason     String?
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  // Relations
  transaction         Transaction               @relation(fields: [transactionId], references: [id])

  @@map("payment_confirmations")
}

model PricingSnapshot {
  id                      String   @id @default(uuid())
  listingId               String
  quantity                Int
  ticketPrice             Json
  buyerPlatformFee        Json
  sellerPlatformFee       Json
  paymentMethodCommission Json
  totalPaid               Json
  sellerReceives          Json
  paymentMethodId         String?
  expiresAt               DateTime
  consumedByTransactionId String?
  createdAt               DateTime @default(now())

  @@map("pricing_snapshots")
}

model Wallet {
  id             String              @id @default(uuid())
  userId         String              @unique
  balance        Json
  pendingBalance Json
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  // Relations
  user           User                @relation(fields: [userId], references: [id])
  transactions   WalletTransaction[]

  @@map("wallets")
}

model WalletTransaction {
  id                  String                @id @default(uuid())
  walletUserId        String
  type                WalletTransactionType
  amount              Json
  description         String
  referenceType       String?
  referenceId         String?
  createdAt           DateTime              @default(now())

  // Relations
  wallet              Wallet                @relation(fields: [walletUserId], references: [userId])

  @@map("wallet_transactions")
}

model Otp {
  id         String    @id @default(uuid())
  userId     String
  type       OTPType
  code       String
  status     OTPStatus @default(pending)
  expiresAt  DateTime
  verifiedAt DateTime?
  createdAt  DateTime  @default(now())

  // Relations
  user       User      @relation(fields: [userId], references: [id])

  @@map("otps")
}

model Review {
  id            String     @id @default(uuid())
  transactionId String
  reviewerId    String
  revieweeId    String
  reviewerRole  ReviewRole
  revieweeRole  ReviewRole
  rating        Int
  comment       String?
  createdAt     DateTime   @default(now())

  // Relations
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  reviewer      User        @relation("ReviewReviewer", fields: [reviewerId], references: [id])
  reviewee      User        @relation("ReviewReviewee", fields: [revieweeId], references: [id])

  @@unique([transactionId, reviewerId])
  @@map("reviews")
}

model TermsVersion {
  id          String        @id @default(uuid())
  userType    TermsUserType
  version     String
  content     String
  status      TermsStatus   @default(draft)
  publishedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("terms_versions")
}

model UserTermsAcceptance {
  id              String        @id @default(uuid())
  userId          String
  termsVersionId  String
  userType        TermsUserType
  acceptedAt      DateTime      @default(now())

  @@unique([userId, termsVersionId])
  @@map("user_terms_acceptances")
}

model UserTermsState {
  id                      String        @id @default(uuid())
  userId                  String
  userType                TermsUserType
  currentTermsVersionId   String?
  acceptedTermsVersionId  String?
  needsAcceptance         Boolean       @default(true)
  updatedAt               DateTime      @updatedAt

  @@unique([userId, userType])
  @@map("user_terms_states")
}

model IdentityVerificationRequest {
  id                   String                     @id @default(uuid())
  userId               String
  status               IdentityVerificationStatus @default(pending)
  legalFirstName       String
  legalLastName        String
  dateOfBirth          String
  governmentIdNumber   String
  documentImageIds     String[]
  selfieImageId        String?
  submittedAt          DateTime                   @default(now())
  reviewedAt           DateTime?
  reviewedBy           String?
  rejectionReason      String?

  // Relations
  user                 User                       @relation(fields: [userId], references: [id])

  @@map("identity_verification_requests")
}

model SupportTicket {
  id            String                @id @default(uuid())
  userId        String
  transactionId String?
  category      SupportTicketCategory
  subject       String
  status        SupportTicketStatus   @default(open)
  assignedTo    String?
  resolvedAt    DateTime?
  closedAt      DateTime?
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  // Relations
  user          User                  @relation(fields: [userId], references: [id])
  messages      SupportMessage[]

  @@map("support_tickets")
}

model SupportMessage {
  id        String               @id @default(uuid())
  ticketId  String
  senderId  String
  sender    SupportMessageSender
  content   String
  createdAt DateTime             @default(now())

  // Relations
  ticket    SupportTicket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@map("support_messages")
}

model NotificationEvent {
  id          String                  @id @default(uuid())
  type        NotificationEventType
  context     Json
  triggeredBy String?
  triggeredAt DateTime                @default(now())
  status      NotificationEventStatus @default(PENDING)
  processedAt DateTime?
  error       String?

  // Relations
  notifications Notification[]

  @@map("notification_events")
}

model Notification {
  id            String               @id @default(uuid())
  eventId       String
  eventType     NotificationEventType
  recipientId   String
  channel       NotificationChannel
  title         String
  body          String
  actionUrl     String?
  status        NotificationStatus   @default(PENDING)
  read          Boolean              @default(false)
  readAt        DateTime?
  sentAt        DateTime?
  deliveredAt   DateTime?
  failedAt      DateTime?
  failureReason String?
  retryCount    Int                  @default(0)
  nextRetryAt   DateTime?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  // Relations
  event         NotificationEvent    @relation(fields: [eventId], references: [id])
  recipient     User                 @relation(fields: [recipientId], references: [id])

  @@map("notifications")
}

model NotificationTemplate {
  id                String                @id @default(uuid())
  eventType         NotificationEventType
  channel           NotificationChannel
  locale            String
  titleTemplate     String
  bodyTemplate      String
  actionUrlTemplate String?
  isActive          Boolean               @default(true)
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  updatedBy         String?

  @@unique([eventType, channel, locale])
  @@map("notification_templates")
}

model NotificationChannelConfig {
  id            String                @id @default(uuid())
  eventType     NotificationEventType @unique
  inAppEnabled  Boolean               @default(true)
  emailEnabled  Boolean               @default(true)
  priority      NotificationPriority  @default(NORMAL)
  updatedAt     DateTime              @updatedAt
  updatedBy     String?

  @@map("notification_channel_configs")
}
```

**Step 2: Generate Prisma client**

Run: `cd backend && npx prisma generate`
Expected: Prisma client generated successfully

**Step 3: Run initial migration**

Run: `cd backend && npx prisma migrate dev --name init`
Expected: Migration created and applied

**Step 4: Commit**

```bash
git add backend/prisma
git commit -m "feat: add complete prisma schema with all models"
```

---

## Task 3: Create PrismaService and PrismaModule

**Files:**
- Create: `backend/src/common/prisma/prisma.service.ts`
- Create: `backend/src/common/prisma/prisma.module.ts`
- Modify: `backend/src/app.module.ts`

**Step 1: Create PrismaService**

```typescript
// backend/src/common/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

**Step 2: Create PrismaModule**

```typescript
// backend/src/common/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 3: Import PrismaModule in AppModule**

Add to `backend/src/app.module.ts`:

```typescript
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // ... other modules
  ],
})
export class AppModule {}
```

**Step 4: Verify compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add backend/src/common/prisma backend/src/app.module.ts
git commit -m "feat: add global PrismaService and PrismaModule"
```

---

## Task 4: Migrate UsersRepository

**Files:**
- Create: `backend/src/modules/users/users.repository.interface.ts`
- Modify: `backend/src/modules/users/users.repository.ts`
- Modify: `backend/src/modules/users/users.module.ts`
- Modify: `backend/src/modules/users/users.service.ts`

**Step 1: Create interface**

Extract the public API from the current UsersRepository into an interface:

```typescript
// backend/src/modules/users/users.repository.interface.ts
import type { Ctx } from '../../common/types/context';
import type { User, UserLevel, UserStatus, UserAddress } from './users.domain';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  publicName: string;
  imageId: string;
  password: string;
  role: import('./users.domain').Role;
  level: UserLevel;
  language: import('./users.domain').Language;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  country?: string;
  currency?: string;
  status?: UserStatus;
}

export interface IUsersRepository {
  getAll(ctx: Ctx): Promise<User[]>;
  findById(ctx: Ctx, id: string): Promise<User | undefined>;
  findByIds(ctx: Ctx, ids: string[]): Promise<User[]>;
  findByEmail(ctx: Ctx, email: string): Promise<User | undefined>;
  findByEmailContaining(ctx: Ctx, searchTerm: string): Promise<User[]>;
  getSellers(ctx: Ctx): Promise<User[]>;
  add(ctx: Ctx, user: CreateUserData): Promise<User>;
  updateEmailVerified(
    ctx: Ctx,
    userId: string,
    emailVerified: boolean,
  ): Promise<User | undefined>;
  updatePhoneVerified(
    ctx: Ctx,
    userId: string,
    phoneVerified: boolean,
    phone?: string,
  ): Promise<User | undefined>;
  updateBasicInfo(
    ctx: Ctx,
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      publicName?: string;
      address?: UserAddress;
      imageId?: string;
    },
  ): Promise<User | undefined>;
  updateLevel(
    ctx: Ctx,
    userId: string,
    level: UserLevel,
  ): Promise<User | undefined>;
  updateToVerifiedSeller(
    ctx: Ctx,
    userId: string,
    identityData: {
      legalFirstName: string;
      legalLastName: string;
      dateOfBirth: string;
      governmentIdNumber: string;
    },
  ): Promise<User | undefined>;
}

export const USERS_REPOSITORY = Symbol('IUsersRepository');
```

**Step 2: Implement Prisma repository**

Replace the content of `backend/src/modules/users/users.repository.ts`:

```typescript
// backend/src/modules/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Ctx } from '../../common/types/context';
import type { User, UserAddress } from './users.domain';
import {
  UserStatus,
  UserLevel,
  IdentityVerificationStatus,
} from './users.domain';
import type { IUsersRepository, CreateUserData } from './users.repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(ctx: Ctx): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.mapToUser(u));
  }

  async findById(ctx: Ctx, id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByIds(ctx: Ctx, ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async findByEmail(ctx: Ctx, email: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByEmailContaining(ctx: Ctx, searchTerm: string): Promise<User[]> {
    if (!searchTerm?.trim()) return [];
    const users = await this.prisma.user.findMany({
      where: {
        email: { contains: searchTerm.trim(), mode: 'insensitive' },
      },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async getSellers(ctx: Ctx): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        level: { in: ['Seller', 'VerifiedSeller'] },
      },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async add(ctx: Ctx, userData: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicName: userData.publicName,
        imageId: userData.imageId,
        password: userData.password,
        role: userData.role,
        level: userData.level,
        status: userData.status ?? UserStatus.Enabled,
        language: userData.language,
        country: userData.country ?? 'Germany',
        currency: userData.currency ?? 'EUR',
        emailVerified: userData.emailVerified,
        phoneVerified: userData.phoneVerified,
      },
    });
    return this.mapToUser(user);
  }

  async updateEmailVerified(
    ctx: Ctx,
    userId: string,
    emailVerified: boolean,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updatePhoneVerified(
    ctx: Ctx,
    userId: string,
    phoneVerified: boolean,
    phone?: string,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified,
          ...(phoneVerified && phone !== undefined && { phone }),
        },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updateBasicInfo(
    ctx: Ctx,
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      publicName?: string;
      address?: UserAddress;
      imageId?: string;
    },
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updates.firstName !== undefined && { firstName: updates.firstName }),
          ...(updates.lastName !== undefined && { lastName: updates.lastName }),
          ...(updates.publicName !== undefined && { publicName: updates.publicName }),
          ...(updates.address !== undefined && { address: updates.address }),
          ...(updates.imageId !== undefined && { imageId: updates.imageId }),
        },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updateLevel(
    ctx: Ctx,
    userId: string,
    level: UserLevel,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { level },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updateToVerifiedSeller(
    ctx: Ctx,
    userId: string,
    identityData: {
      legalFirstName: string;
      legalLastName: string;
      dateOfBirth: string;
      governmentIdNumber: string;
    },
  ): Promise<User | undefined> {
    try {
      const now = new Date();
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          level: UserLevel.VerifiedSeller,
          identityVerification: {
            status: IdentityVerificationStatus.Approved,
            legalFirstName: identityData.legalFirstName,
            legalLastName: identityData.legalLastName,
            dateOfBirth: identityData.dateOfBirth,
            governmentIdNumber: identityData.governmentIdNumber,
            submittedAt: now,
            reviewedAt: now,
          },
        },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  private mapToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      role: prismaUser.role,
      level: prismaUser.level,
      status: prismaUser.status ?? UserStatus.Enabled,
      publicName: prismaUser.publicName,
      imageId: prismaUser.imageId ?? '',
      phone: prismaUser.phone ?? undefined,
      password: prismaUser.password,
      country: prismaUser.country,
      currency: prismaUser.currency as any,
      language: prismaUser.language,
      address: prismaUser.address as UserAddress | undefined,
      emailVerified: prismaUser.emailVerified,
      phoneVerified: prismaUser.phoneVerified,
      tosAcceptedAt: prismaUser.tosAcceptedAt ?? undefined,
      identityVerification: prismaUser.identityVerification as any,
      bankAccount: prismaUser.bankAccount as any,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
```

**Step 3: Update UsersModule to use interface injection**

Modify `backend/src/modules/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { USERS_REPOSITORY } from './users.repository.interface';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
    UsersService,
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
```

**Step 4: Update UsersService to use interface**

Modify the constructor in `backend/src/modules/users/users.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { IUsersRepository, USERS_REPOSITORY } from './users.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: IUsersRepository,
    // ... other dependencies
  ) {}
  // ... rest of service
}
```

**Step 5: Verify compilation**

Run: `cd backend && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add backend/src/modules/users
git commit -m "feat: migrate UsersRepository to Prisma with interface"
```

---

## Task 5-19: Migrate Remaining Repositories

For each of the remaining 15 repositories, follow the same pattern as Task 4:

1. Create `{module}.repository.interface.ts` with interface and symbol
2. Rewrite `{module}.repository.ts` with Prisma implementation
3. Update `{module}.module.ts` for DI
4. Update `{module}.service.ts` to inject interface
5. Verify build
6. Commit

**Repositories to migrate in order:**

| Task | Module | Repository | Notes |
|------|--------|------------|-------|
| 5 | images | ImagesRepository | Simple, no relations |
| 6 | otp | OTPRepository | Simple |
| 7 | terms | TermsRepository | 3 entities |
| 8 | reviews | ReviewsRepository | Relations to Transaction, User |
| 9 | events | EventsRepository | 3 entities (Event, EventDate, EventSection) |
| 10 | tickets | TicketsRepository | JSON ticketUnits field |
| 11 | transactions | TransactionsRepository | Complex, many relations |
| 12 | payments | PaymentsRepository | PaymentIntent |
| 13 | payments/pricing | PricingRepository | PricingSnapshot |
| 14 | payment-methods | PaymentMethodsRepository | Simple |
| 15 | payment-confirmations | PaymentConfirmationsRepository | Simple |
| 16 | wallet | WalletRepository | 2 entities |
| 17 | identity-verification | IdentityVerificationRepository | Simple |
| 18 | support | SupportRepository | 2 entities |
| 19 | notifications | NotificationsRepository | 4 entities, most complex |

Each task follows the exact pattern of Task 4. I'll provide detailed steps for the complex ones (events, tickets, notifications) when we reach them.

---

## Task 20: Cleanup and Final Verification

**Files:**
- Delete: `backend/src/common/storage/key-value-file-storage.ts`
- Delete: `backend/src/common/storage/file-storage.ts`
- Delete: `backend/data/` directory (optional, keep for reference)

**Step 1: Remove unused storage classes**

Delete the JSON storage implementation files once all repositories are migrated.

**Step 2: Run full test suite**

Run: `cd backend && npm test`
Expected: All tests pass

**Step 3: Manual verification**

1. Start PostgreSQL: `docker compose up -d`
2. Run migrations: `cd backend && npx prisma migrate dev`
3. Start app: `cd backend && npm run dev`
4. Test basic flows:
   - User registration/login
   - Create event
   - Create listing
   - Purchase flow

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete migration from JSON to PostgreSQL with Prisma"
```

---

## Summary

- **Total tasks:** 20
- **Infrastructure:** Tasks 1-3
- **Repository migrations:** Tasks 4-19 (16 repositories)
- **Cleanup:** Task 20

Each repository migration follows the same pattern:
1. Interface → 2. Prisma impl → 3. Module DI → 4. Service injection → 5. Test → 6. Commit
