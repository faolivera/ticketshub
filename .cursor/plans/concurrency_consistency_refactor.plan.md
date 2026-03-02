---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan de Refactor: Consistencia de Datos y Concurrencia

> **Fecha de creación:** 2026-03-01  
> **Estado:** En planificación  
> **Conversación de referencia:** Análisis de race conditions y concurrency issues

---

## Resumen Ejecutivo

Este plan aborda los problemas de consistencia de datos y race conditions identificados en el sistema TicketsHub. El objetivo es implementar transacciones atómicas, locking optimista y pesimista, y patrones de procesamiento seguros para prevenir pérdida de dinero, double-booking, y estados inconsistentes.

---

## 1. Inventario Completo de Problemas

### 1.1 Problemas CRÍTICOS (Pérdida de dinero / Overselling)


| ID        | Módulo       | Problema                                | Impacto                                  |
| --------- | ------------ | --------------------------------------- | ---------------------------------------- |
| **W-01**  | Wallet       | `holdFunds()` lost updates              | Escrow underreported                     |
| **W-02**  | Wallet       | `releaseFunds()` lost updates           | Seller pierde dinero                     |
| **W-03**  | Wallet       | `debitFunds()` overdraw                 | Usuario retira más de lo que tiene       |
| **W-04**  | Wallet       | `creditFunds()` lost updates            | Créditos perdidos                        |
| **W-05**  | Wallet       | `refundHeldFunds()` lost updates        | Refunds perdidos                         |
| **T-01**  | Tickets      | `reserveUnits()` double-booking         | Dos usuarios compran el mismo ticket     |
| **T-02**  | Tickets      | `restoreUnits()` concurrent collision   | Tickets stuck en Reserved                |
| **T-03**  | Tickets      | `cancelListing()` vs purchase race      | Listing cancelled con transacción activa |
| **T-04**  | Tickets      | `updateListing()` overwrites status     | Precio/estado corrupto                   |
| **TX-01** | Transactions | `initiatePurchase()` non-atomic         | Orphan transactions, pricing consumed    |
| **TX-02** | Transactions | `handlePaymentReceived()` double escrow | Doble hold en wallet                     |
| **TX-03** | Transactions | `confirmReceipt()` vs auto-release      | Doble pago al seller                     |
| **TX-04** | Transactions | Status transitions race                 | Estado inconsistente                     |
| **P-01**  | Pricing      | Snapshot double-consumption             | Mismo precio usado dos veces             |


### 1.2 Problemas ALTOS (Duplicación / Inconsistencia)


| ID        | Módulo        | Problema                            | Impacto                            |
| --------- | ------------- | ----------------------------------- | ---------------------------------- |
| **S-01**  | Schedulers    | Multi-instance duplicate processing | Doble cancelación/release          |
| **S-02**  | Schedulers    | Scheduler vs user action race       | Timeout cancela mientras user paga |
| **N-01**  | Notifications | Event duplicate processing          | Emails duplicados                  |
| **N-02**  | Notifications | Email send duplicate                | Mismo email enviado 2+ veces       |
| **IV-01** | Identity      | Admin review race                   | Estado user level inconsistente    |
| **E-01**  | Events        | Approval race                       | Listings activados incorrectamente |


### 1.3 Problemas MEDIOS (UX / Data Quality)


| ID        | Módulo  | Problema                      | Impacto                  |
| --------- | ------- | ----------------------------- | ------------------------ |
| **UX-01** | General | Sin feedback de conflictos    | Usuario no sabe qué pasó |
| **UX-02** | General | UI no refresca tras conflicto | Datos stale mostrados    |


### 1.4 Problemas PENDIENTES (Post-integración Mercado Pago)


| ID         | Módulo   | Problema              | Status   |
| ---------- | -------- | --------------------- | -------- |
| **PAY-01** | Payments | Webhook idempotency   | DIFERIDO |
| **PAY-02** | Payments | External API rollback | DIFERIDO |


---

## 2. Acciones a Tomar

### 2.1 Infraestructura Base


| Acción   | Descripción                                        | Resuelve                              |
| -------- | -------------------------------------------------- | ------------------------------------- |
| **A-01** | Crear `TransactionManager` service                 | TX-01, y habilita todas las demás     |
| **A-02** | Crear tipo `TxCtx` que extiende `Ctx`              | Propagación de transacciones          |
| **A-03** | Crear `BaseRepository` con método `getClient(ctx)` | Todos los repos usan tx si disponible |
| **A-04** | Agregar columna `version` a tablas críticas        | Optimistic locking                    |
| **A-05** | Crear exception `OptimisticLockException`          | UX-01                                 |
| **A-06** | Crear exception `InsufficientFundsException`       | W-03, UX-01                           |
| **A-07** | Crear tabla `scheduler_locks`                      | S-01                                  |
| **A-08** | Crear servicio `DistributedLockService`            | S-01                                  |


### 2.2 Schema Changes


| Acción   | Descripción                                   | Resuelve            |
| -------- | --------------------------------------------- | ------------------- |
| **A-09** | Normalizar `ticketUnits` a tabla `TicketUnit` | T-01, T-02          |
| **A-10** | Agregar `version` a `Wallet`                  | W-01 a W-05         |
| **A-11** | Agregar `version` a `TicketListing`           | T-03, T-04          |
| **A-12** | Agregar `version` a `TicketUnit`              | T-01, T-02          |
| **A-13** | Agregar `version` a `Transaction`             | TX-02, TX-03, TX-04 |
| **A-14** | Agregar `version` a `PricingSnapshot`         | P-01                |
| **A-15** | Agregar `version` a `NotificationEvent`       | N-01                |


### 2.3 Repository Layer Changes


| Acción   | Descripción                                          | Resuelve      |
| -------- | ---------------------------------------------------- | ------------- |
| **A-16** | `WalletRepository` usa `FOR UPDATE` + atomic ops     | W-01 a W-05   |
| **A-17** | `TicketsRepository` refactor para `TicketUnit` table | T-01, T-02    |
| **A-18** | `TicketsRepository` usa `FOR UPDATE`                 | T-01 a T-04   |
| **A-19** | `TransactionsRepository` usa `FOR UPDATE`            | TX-02 a TX-04 |
| **A-20** | `PricingRepository` usa `FOR UPDATE`                 | P-01          |
| **A-21** | `NotificationsRepository` usa atomic claim pattern   | N-01, N-02    |


### 2.4 Service Layer Changes


| Acción   | Descripción                                     | Resuelve      |
| -------- | ----------------------------------------------- | ------------- |
| **A-22** | `WalletService` wrapped en transactions         | W-01 a W-05   |
| **A-23** | `TicketsService` wrapped en transactions        | T-01 a T-04   |
| **A-24** | `TransactionsService.initiatePurchase()` atomic | TX-01         |
| **A-25** | `TransactionsService` status transitions atomic | TX-02 a TX-04 |
| **A-26** | `PricingService.validateAndConsume()` atomic    | P-01          |
| **A-27** | `NotificationsWorker` usa claim pattern         | N-01, N-02    |
| **A-28** | Schedulers usan `DistributedLockService`        | S-01, S-02    |


### 2.5 Error Handling & UX


| Acción   | Descripción                                   | Resuelve     |
| -------- | --------------------------------------------- | ------------ |
| **A-29** | Backend: Exceptions con códigos estructurados | UX-01        |
| **A-30** | Frontend: Error handler para conflicts        | UX-01, UX-02 |
| **A-31** | Frontend: Auto-refresh on conflict            | UX-02        |


---

## 3. Acciones NO Tomadas (Diferidas)


| ID       | Acción                                   | Razón                        | Cuándo Implementar       |
| -------- | ---------------------------------------- | ---------------------------- | ------------------------ |
| **D-01** | Tabla `processed_webhooks`               | No hay webhooks externos aún | Al integrar Mercado Pago |
| **D-02** | Reservation Pattern para Payment Intents | No hay payment provider      | Al integrar Mercado Pago |
| **D-03** | Idempotency key en payment flows         | No hay payment provider      | Al integrar Mercado Pago |


### Problemas que Quedan Pendientes


| Problema                         | Por Qué Queda Pendiente      |
| -------------------------------- | ---------------------------- |
| **PAY-01** Webhook duplicates    | No hay webhooks externos aún |
| **PAY-02** External API rollback | No hay APIs de pago externas |


### Riesgos Aceptados

Mientras no se implemente Mercado Pago:

- El sistema actual de "upload payment confirmation" no tiene webhooks, así que PAY-01 no aplica.
- No hay llamadas a APIs de pago externas, así que PAY-02 no aplica.

**Cuando integres Mercado Pago, DEBES implementar D-01, D-02, D-03 antes de ir a producción.**

---

## 4. Plan de Acción por PRs

### PR 1: Infraestructura de Transacciones

**Scope:** Foundation sin cambios funcionales  
**Riesgo:** Bajo (no cambia comportamiento)  
**Estado:** [ ] Pendiente

#### Cambios

```
backend/src/common/
├── database/
│   ├── transaction-manager.ts        # NEW: TransactionManager service
│   ├── transaction-manager.module.ts # NEW: Module
│   └── types.ts                      # NEW: TxCtx type
├── repositories/
│   └── base.repository.ts            # NEW: BaseRepository con getClient()
└── exceptions/
    ├── optimistic-lock.exception.ts  # NEW
    ├── insufficient-funds.exception.ts # NEW
    └── conflict.exception.ts         # NEW
```

#### Tests

- Unit: `TransactionManager` ejecuta función en transaction
- Unit: `TransactionManager` reusa transaction si ya existe en ctx
- Unit: `TransactionManager` rollback on error
- Unit: `BaseRepository.getClient()` retorna tx si existe
- Unit: `BaseRepository.getClient()` retorna prisma si no hay tx

#### Criterios de Aceptación

- `TransactionManager` es inyectable en cualquier módulo
- `TxCtx` es compatible con `Ctx` existente
- No hay cambios en comportamiento actual

---

### PR 2: Schema - Version Columns

**Scope:** Migraciones de schema  
**Riesgo:** Bajo (nuevas columnas con default)  
**Estado:** [ ] Pendiente

#### Cambios

```
backend/prisma/
└── schema.prisma  # ADD: version Int @default(1) to critical tables

# Tablas afectadas:
# - Wallet
# - TicketListing  
# - Transaction
# - PricingSnapshot
# - NotificationEvent
```

#### Migration

```sql
ALTER TABLE wallets ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE ticket_listings ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE transactions ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE pricing_snapshots ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE notification_events ADD COLUMN version INT NOT NULL DEFAULT 1;
```

#### Tests

- Migration runs successfully
- Existing data has version = 1
- New records have version = 1

#### Criterios de Aceptación

- Prisma client regenerado con nuevos campos
- Aplicación sigue funcionando normalmente
- Todos los tests existentes pasan

---

### PR 3: Schema - Normalizar TicketUnits

**Scope:** Migración estructural importante  
**Riesgo:** ALTO (cambio de estructura)  
**Estado:** [ ] Pendiente

#### Cambios

```
backend/prisma/
└── schema.prisma  # ADD: TicketUnit model, REMOVE: ticketUnits Json

backend/src/modules/tickets/
├── tickets.domain.ts          # UPDATE: TicketUnit as separate entity
├── tickets.repository.ts      # REWRITE: Use TicketUnit table
├── tickets.repository.interface.ts # UPDATE: New methods
└── tickets.service.ts         # UPDATE: Use new repository methods
```

#### Schema Change

```prisma
model TicketUnit {
  id          String           @id @default(uuid())
  listingId   String
  identifier  String?          // seat number, row, etc.
  status      TicketUnitStatus @default(Available)
  version     Int              @default(1)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  listing     TicketListing    @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  @@map("ticket_units")
}

model TicketListing {
  // ... existing fields ...
  // REMOVE: ticketUnits Json
  ticketUnits TicketUnit[]  // ADD: relation
}
```

#### Migration Strategy

1. Create `ticket_units` table
2. Migrate data from JSON to table
3. Remove JSON column
4. Update all queries

#### Tests

- Unit: `TicketUnit` CRUD operations
- Unit: Migration script converts JSON correctly
- Integration: `reserveUnits` works with new structure
- Integration: `restoreUnits` works with new structure
- Integration: Listing creation creates units
- Integration: Listing deletion cascades to units

#### Criterios de Aceptación

- Todos los datos migrados correctamente
- No hay pérdida de información
- Performance igual o mejor que JSON
- Todos los flows de tickets funcionan

---

### PR 4: Distributed Lock para Schedulers

**Scope:** Prevenir procesamiento duplicado en schedulers  
**Riesgo:** Bajo  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/prisma/
└── schema.prisma  # ADD: SchedulerLock model

backend/src/common/
└── locks/
    ├── distributed-lock.service.ts  # NEW
    └── distributed-lock.module.ts   # NEW

backend/src/modules/transactions/
└── transactions.scheduler.ts  # UPDATE: Use lock

backend/src/modules/notifications/
└── notifications.scheduler.ts # UPDATE: Use lock
```

#### Schema

```prisma
model SchedulerLock {
  id        String   @id
  lockedBy  String
  lockedAt  DateTime
  expiresAt DateTime
  
  @@map("scheduler_locks")
}
```

#### Tests

- Unit: `acquireLock` returns true when lock available
- Unit: `acquireLock` returns false when locked by another
- Unit: `acquireLock` acquires expired lock
- Unit: `releaseLock` releases owned lock
- Integration: Only one scheduler instance processes at a time

#### Criterios de Aceptación

- Scheduler no procesa duplicados entre instancias
- Lock expira automáticamente si el proceso muere
- Logging claro de adquisición/release de locks

---

### PR 5: Wallet - Transacciones y Locking

**Scope:** Wallet service con consistencia fuerte  
**Riesgo:** ALTO (operaciones de dinero)  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/src/modules/wallet/
├── wallet.domain.ts           # UPDATE: Add version field
├── wallet.repository.ts       # REWRITE: FOR UPDATE, optimistic lock
├── wallet.repository.interface.ts # UPDATE: New signatures
└── wallet.service.ts          # UPDATE: Use TransactionManager

backend/src/test/unit/modules/wallet/
└── wallet.service.spec.ts     # UPDATE: Test concurrency
```

#### Key Implementation

**Repository:**

```typescript
async updateBalancesWithLock(
  ctx: TxCtx,
  userId: string,
  balanceChange: number,
  pendingChange: number,
  expectedVersion: number,
): Promise<Wallet> {
  const client = this.getClient(ctx);
  
  // Atomic update with version check
  const result = await client.$executeRaw`
    UPDATE wallets
    SET 
      balance = balance + ${balanceChange},
      pending_balance = pending_balance + ${pendingChange},
      version = version + 1,
      updated_at = NOW()
    WHERE user_id = ${userId} AND version = ${expectedVersion}
  `;
  
  if (result === 0) {
    throw new OptimisticLockException('Wallet', userId);
  }
  
  return this.findByUserId(ctx, userId);
}
```

**Service:**

```typescript
async holdFunds(ctx: Ctx, sellerId: string, amount: Money): Promise<void> {
  await this.txManager.executeInTransaction(ctx, async (txCtx) => {
    const wallet = await this.walletRepository.findByUserIdForUpdate(txCtx, sellerId);
    
    if (!wallet) throw new NotFoundException('Wallet not found');
    
    await this.walletRepository.updateBalancesWithLock(
      txCtx,
      sellerId,
      0,                    // balance change
      amount.amount,        // pending change
      wallet.version,
    );
    
    await this.walletRepository.createTransaction(txCtx, { ... });
  });
}
```

#### Tests

- Unit: `holdFunds` increments pending atomically
- Unit: `releaseFunds` transfers pending to balance atomically
- Unit: `debitFunds` throws InsufficientFundsException
- Unit: Concurrent `holdFunds` doesn't lose money
- Unit: OptimisticLockException thrown on version mismatch
- Integration: Two concurrent debits - one succeeds, one fails

#### Criterios de Aceptación

- No lost updates en operaciones de wallet
- Overdraw es imposible
- Errores claros cuando hay conflictos
- Wallet transactions tienen audit trail correcto

---

### PR 6: Tickets - Transacciones y Locking

**Scope:** Ticket reservation con consistencia fuerte  
**Riesgo:** ALTO (core business)  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/src/modules/tickets/
├── tickets.repository.ts       # UPDATE: FOR UPDATE on TicketUnit
└── tickets.service.ts          # UPDATE: Use TransactionManager

backend/src/test/unit/modules/tickets/
└── tickets.service.spec.ts     # UPDATE: Test concurrency
```

#### Key Implementation

**Repository:**

```typescript
async reserveUnitsWithLock(
  ctx: TxCtx,
  listingId: string,
  unitIds: string[],
): Promise<TicketUnit[]> {
  const client = this.getClient(ctx);
  
  // Lock specific units
  const units = await client.$queryRaw<TicketUnit[]>`
    SELECT * FROM ticket_units
    WHERE id = ANY(${unitIds}::uuid[])
    AND listing_id = ${listingId}
    FOR UPDATE
  `;
  
  // Validate all available
  const unavailable = units.filter(u => u.status !== 'Available');
  if (unavailable.length > 0) {
    throw new BadRequestException('Some tickets are no longer available');
  }
  
  if (units.length !== unitIds.length) {
    throw new BadRequestException('Some ticket units not found');
  }
  
  // Atomic update
  await client.ticketUnit.updateMany({
    where: { id: { in: unitIds } },
    data: { 
      status: 'Reserved',
      version: { increment: 1 },
    },
  });
  
  return this.findUnitsByIds(ctx, unitIds);
}
```

#### Tests

- Unit: `reserveUnits` locks units correctly
- Unit: Concurrent reserve of same unit - one succeeds
- Unit: Reserve of different units in same listing - both succeed
- Unit: `restoreUnits` releases lock correctly
- Integration: Double-booking is impossible

#### Criterios de Aceptación

- No double-booking posible
- Reservas concurrentes de units diferentes funcionan
- Errores claros cuando ticket no disponible
- Listing status se actualiza correctamente

---

### PR 7: Transactions - Flujos Atómicos

**Scope:** Transaction flows con consistencia fuerte  
**Riesgo:** ALTO (orquesta todo)  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/src/modules/transactions/
├── transactions.repository.ts  # UPDATE: FOR UPDATE, version check
├── transactions.service.ts     # REWRITE: Atomic flows
└── transactions.scheduler.ts   # Already using distributed lock (PR 4)

backend/src/test/unit/modules/transactions/
└── transactions.service.spec.ts # UPDATE: Test atomic flows
```

#### Key Implementation

**initiatePurchase - Atomic:**

```typescript
async initiatePurchase(ctx: Ctx, ...): Promise<...> {
  return this.txManager.executeInTransaction(ctx, async (txCtx) => {
    // 1. Consume pricing (with lock)
    const { snapshot } = await this.pricingService.validateAndConsume(txCtx, ...);
    
    // 2. Reserve tickets (with lock)
    await this.ticketsService.reserveTickets(txCtx, listingId, ticketUnitIds);
    
    // 3. Create transaction
    const transaction = await this.transactionsRepository.create(txCtx, { ... });
    
    return { transaction };
  }, { isolationLevel: 'Serializable' });
}
```

**Status Transitions:**

```typescript
async handlePaymentReceived(ctx: Ctx, transactionId: string): Promise<Transaction> {
  return this.txManager.executeInTransaction(ctx, async (txCtx) => {
    // Lock transaction row
    const txn = await this.transactionsRepository.findByIdForUpdate(txCtx, transactionId);
    
    // Validate status
    if (!validStatuses.includes(txn.status)) {
      throw new BadRequestException('Invalid status transition');
    }
    
    // Hold funds (inside same db transaction)
    await this.walletService.holdFunds(txCtx, txn.sellerId, txn.sellerReceives);
    
    // Update status with version check
    return this.transactionsRepository.updateWithVersion(txCtx, transactionId, {
      status: TransactionStatus.PaymentReceived,
    }, txn.version);
  });
}
```

#### Tests

- Unit: `initiatePurchase` is atomic - all or nothing
- Unit: `initiatePurchase` concurrent - one succeeds
- Unit: `handlePaymentReceived` only runs once
- Unit: Status transitions are atomic
- Integration: Scheduler + user action race handled

#### Criterios de Aceptación

- No orphan transactions
- No double escrow
- No double release
- Scheduler no interfiere con user actions

---

### PR 8: Pricing Snapshot - Consumo Atómico

**Scope:** Pricing snapshot con consumo único  
**Riesgo:** Medio  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/src/modules/payments/pricing/
├── pricing.repository.ts       # UPDATE: FOR UPDATE
└── pricing.service.ts          # UPDATE: Atomic consume

backend/src/test/unit/modules/payments/
└── pricing.service.spec.ts     # UPDATE: Test concurrency
```

#### Key Implementation

```typescript
async validateAndConsume(ctx: TxCtx, snapshotId: string, ...): Promise<...> {
  const client = this.txManager.getClient(ctx);
  
  // Lock and validate in one query
  const [snapshot] = await client.$queryRaw<PricingSnapshot[]>`
    SELECT * FROM pricing_snapshots
    WHERE id = ${snapshotId}
    AND consumed_by_transaction_id IS NULL
    AND expires_at > NOW()
    FOR UPDATE
  `;
  
  if (!snapshot) {
    throw new BadRequestException('Snapshot not available or already consumed');
  }
  
  // Consume
  await client.pricingSnapshot.update({
    where: { id: snapshotId },
    data: {
      consumedAt: new Date(),
      consumedByTransactionId: transactionId,
      version: { increment: 1 },
    },
  });
  
  return { snapshot };
}
```

#### Tests

- Unit: Concurrent consume - one succeeds, one fails
- Unit: Expired snapshot fails
- Unit: Already consumed snapshot fails

#### Criterios de Aceptación

- Un snapshot solo puede usarse una vez
- Error claro si ya fue consumido
- Error claro si expiró

---

### PR 9: Notifications - Atomic Claim Pattern

**Scope:** Procesamiento de notificaciones sin duplicados  
**Riesgo:** Bajo  
**Estado:** [x] Completado (2026-03-02)

#### Cambios

```
backend/src/modules/notifications/
├── notifications.repository.ts # UPDATE: Atomic claim
├── notifications.worker.ts     # UPDATE: Use claim pattern
└── notifications.scheduler.ts  # Already using distributed lock (PR 4)

backend/src/test/unit/modules/notifications/
└── notifications.worker.spec.ts # NEW
```

#### Key Implementation

```typescript
// Repository
async claimNextPendingEvent(ctx: TxCtx): Promise<NotificationEvent | null> {
  const client = this.getClient(ctx);
  
  const [event] = await client.$queryRaw<NotificationEvent[]>`
    UPDATE notification_events
    SET status = 'PROCESSING', updated_at = NOW(), version = version + 1
    WHERE id = (
      SELECT id FROM notification_events
      WHERE status = 'PENDING'
      ORDER BY triggered_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  
  return event ?? null;
}

// Worker
async processPendingEvents(ctx: Ctx): Promise<void> {
  let event: NotificationEvent | null;
  
  while ((event = await this.repository.claimNextPendingEvent(ctx))) {
    await this.processEvent(ctx, event);
  }
}
```

#### Tests

- Unit: `claimNextPendingEvent` returns one event
- Unit: Concurrent claims get different events
- Unit: `SKIP LOCKED` skips in-progress events
- Integration: No duplicate notifications

#### Criterios de Aceptación

- No emails duplicados
- No notifications duplicadas
- Processing continúa si un evento falla

---

### PR 10: Error Handling & Frontend

**Scope:** Errores descriptivos y manejo en UI  
**Riesgo:** Bajo  
**Estado:** [ ] Pendiente

#### Cambios

```
backend/src/common/
└── filters/
    └── http-exception.filter.ts  # UPDATE: Structured error codes

frontend/src/
├── lib/
│   └── error-handler.ts          # NEW: Centralized error handling
├── hooks/
│   └── useApiError.ts            # NEW: Error hook
└── components/
    └── ConflictErrorModal.tsx    # NEW: Conflict error UI
```

#### Error Response Format

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;           // 'OPTIMISTIC_LOCK_CONFLICT' | 'INSUFFICIENT_FUNDS' | etc.
    message: string;        // Human-readable
    details?: {
      resource?: string;    // 'Wallet' | 'TicketListing' | etc.
      resourceId?: string;
      retryable: boolean;
    };
  };
}
```

#### Frontend Handling

```typescript
// useApiError.ts
const handleApiError = (error: ApiError) => {
  switch (error.code) {
    case 'OPTIMISTIC_LOCK_CONFLICT':
      showConflictModal({
        message: error.message,
        onRefresh: () => window.location.reload(),
      });
      break;
    case 'INSUFFICIENT_FUNDS':
      showErrorToast(error.message);
      break;
    case 'TICKET_NOT_AVAILABLE':
      showErrorToast(error.message);
      router.push('/listings/' + error.details.resourceId);
      break;
  }
};
```

#### Tests

- Unit: Exception filter formats errors correctly
- Unit: OptimisticLockException has correct code
- E2E: Conflict triggers refresh modal
- E2E: Insufficient funds shows toast

#### Criterios de Aceptación

- Todos los errores de concurrencia tienen código único
- Frontend muestra mensajes claros
- Usuario sabe cómo proceder tras error

---

## 5. Diagrama de Dependencias entre PRs

```
PR 1 (TransactionManager)
  │
  ├──► PR 2 (Version Columns)
  │      │
  │      └──► PR 3 (TicketUnits Table)
  │             │
  │             └──► PR 6 (Tickets Locking)
  │
  ├──► PR 4 (Distributed Lock)
  │      │
  │      └──► PR 9 (Notifications Claim)
  │
  ├──► PR 5 (Wallet Locking)
  │
  ├──► PR 8 (Pricing Atomic)
  │
  └──► PR 7 (Transactions Atomic)
         │
         └──► Requiere PR 5, PR 6, PR 8

PR 10 (Error Handling) ──► Puede hacerse en paralelo después de PR 1
```

---

## 6. Orden de Ejecución Recomendado


| Orden | PR    | Razón                                     |
| ----- | ----- | ----------------------------------------- |
| 1     | PR 1  | Foundation                                |
| 2     | PR 2  | Schema base                               |
| 3     | PR 4  | Independent, unblocks schedulers          |
| 4     | PR 3  | Critical schema change                    |
| 5     | PR 5  | Wallet (critical money ops)               |
| 6     | PR 6  | Tickets (after PR 3)                      |
| 7     | PR 8  | Pricing (simple)                          |
| 8     | PR 7  | Transactions (orchestration, needs 5,6,8) |
| 9     | PR 9  | Notifications (uses distributed lock)     |
| 10    | PR 10 | Polish (can be parallel after PR 1)       |


---

## 7. Checklist de Validación Final

Después de todos los PRs:

- **W-01 a W-05:** Run concurrent wallet operations test suite
- **T-01 a T-04:** Run concurrent ticket reservation test suite
- **TX-01 a TX-04:** Run full purchase flow under load
- **P-01:** Run concurrent pricing snapshot consumption test
- **S-01, S-02:** Run schedulers in multiple instances
- **N-01, N-02:** Verify no duplicate notifications
- **UX-01, UX-02:** Manual testing of error flows

---

## 8. Notas de Implementación

### Patrones Clave

1. **TransactionManager**: Permite propagar transacciones a través de servicios usando `TxCtx`
2. **FOR UPDATE**: Bloquea filas durante la transacción para prevenir lecturas concurrentes
3. **FOR UPDATE SKIP LOCKED**: Para job queues, salta filas bloqueadas
4. **Optimistic Locking**: Columna `version` incrementa en cada update, falla si no coincide
5. **Atomic Claim**: UPDATE ... WHERE ... RETURNING para reclamar items de cola atómicamente

### Consideraciones de Performance

- `FOR UPDATE` puede causar contención bajo alta carga
- Usar `SKIP LOCKED` donde sea apropiado (job queues)
- Mantener transacciones cortas
- Considerar retry logic para `OptimisticLockException`

### Compatibilidad Hacia Atrás

- Implementar estos cambios como si no existieran datos (Hacer un truncate de DB antes comenzar con los cambios). No hace falta mantener retrocompatibilidad con datos existentes ya que la DB esta vacia y el producto no esta productivo todavia
- Algunos repositorios no van a tener transaction activa (ya que son operaciones que no necesitan ejecutarse en una transaction). Esto esta bien y deberia funcionar



---

## 9. Post-Mercado Pago (Trabajo Futuro)

Cuando se integre Mercado Pago:

1. **Crear tabla `processed_webhooks`**
  - Almacenar IDs de eventos de webhook procesados
  - Check antes de procesar cualquier webhook
2. **Implementar Reservation Pattern**
  - Separar operaciones DB de llamadas a APIs externas
  - Rollback manual si API call falla
3. **Idempotency Keys**
  - Generar keys únicos para cada operación de pago
  - Enviar a Mercado Pago para prevenir duplicados

---

*Última actualización: 2026-03-01*