# Transaction Audit Log – Implementation Plan

## Overview

Add an audit log for `Transaction` at **repository level**: every create and update writes one row to `TransactionAuditLog`. No "before" state is read; we only store **who** changed it, **when**, and **what** (the payload of the change). The first audit record is emitted when the transaction is **created**.

---

## Task Plan

**Type**: Feature  
**Scope**: Backend only  

**Rules that apply**:
- [x] Language convention (English in code)
- [ ] Arquitecto consulted — not needed; single new table + repository hook
- [x] Backend Dev (this implementation)
- [ ] Frontend Dev — N/A (no UI in this phase)
- [ ] API contract — N/A (audit is internal; optional admin API later)
- [ ] i18n — N/A
- [x] Error handling (audit insert failure: log, optionally don’t fail the main op)
- [ ] E2E flow — manual verification / unit tests for repository

**Rules being skipped**: None.

---

## 1. Schema: `TransactionAuditLog` table

Add a new model in `backend/prisma/schema.prisma`:

```prisma
model TransactionAuditLog {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  action        String   // 'created' | 'updated'
  changedAt     DateTime @default(now()) @map("changed_at")
  changedBy     String   @map("changed_by")   // userId or 'system'
  payload       Json     // for created: snapshot; for updated: the updates partial

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@index([transactionId, changedAt(sort: Desc)])
  @@map("transaction_audit_logs")
}
```

On `Transaction` add the relation:

```prisma
model Transaction {
  // ... existing fields ...
  chatMessages   TransactionChatMessage[]
  auditLogs      TransactionAuditLog[]
  // ...
}
```

- **Migration**: `npx prisma migrate dev --name add_transaction_audit_log`

---

## 2. Repository: where to write the audit

| Method | When | Action | Payload |
|--------|------|--------|--------|
| `create(ctx, transaction)` | After `client.transaction.create` | `'created'` | Snapshot of the created transaction (domain shape or Prisma result mapped to a plain JSON-serializable object). Prefer a fixed set of fields (e.g. id, listingId, buyerId, sellerId, status, createdAt, etc.) to avoid leaking internal structure. |
| `update(ctx, id, updates)` | After `client.transaction.update` | `'updated'` | The `updates` partial. Must be JSON-serializable (e.g. build a plain object from `updates`; dates as ISO strings). |
| `updateWithVersion(ctx, id, updates, expectedVersion)` | After `client.transaction.update` | `'updated'` | Same as above: the `updates` partial, serialized. |

**`changedBy`**: `ctx.userId ?? 'system'`.

Use the **same Prisma client** as the main operation (`getClient(ctx)`), so when the service runs inside `executeInTransaction`, the audit insert runs in the **same DB transaction** and commits or rolls back with the main write.

---

## 3. Payload content (no “before” read)

- **On create**  
  Store a minimal snapshot of the created transaction (e.g. `id`, `listingId`, `buyerId`, `sellerId`, `status`, `requiredActor`, `paymentExpiresAt`, `createdAt`). Use the result of `client.transaction.create` (mapped to a plain object) so we don’t depend on domain types. No need to store full JSON blobs (e.g. `ticketPrice`) unless required later.

- **On update / updateWithVersion**  
  Store the **updates** object only. Convert to a plain, JSON-serializable object (e.g. from `buildUpdateData(updates)` or a dedicated helper that takes `Partial<Transaction>` and returns a plain object with the same keys; ensure `Date` → ISO string). Do **not** read the previous row; only persist what was passed in.

---

## 4. Error handling

- If the audit insert fails:
  - **Option A (recommended)**: Log the error and **do not** throw; the main create/update already succeeded. Audit is best-effort.
  - **Option B**: Re-throw so the whole operation fails (stricter, but may break flows that don’t expect audit to be critical).

Recommendation: **Option A** with a clear log (e.g. `this.logger` or `console.error` with context). Document this in the repository so future readers know audit is non-blocking.

---

## 5. Implementation steps (checklist)

1. **Prisma**
   - [x] Add `TransactionAuditLog` model and `auditLogs` relation on `Transaction`.
   - [x] Migration added: `20260309120000_add_transaction_audit_log/migration.sql`. Run when DB is ready: `npx prisma migrate dev` (or `migrate deploy`).

2. **Repository**
   - [x] Private method `writeAuditLog(client, transactionId, action, changedBy, payload)`: uses same client as main op, `changedBy = ctx.userId ?? 'system'`, inserts into `transaction_audit_logs`, catch/log only (Option A). Awaited so it runs in same DB transaction when applicable.
   - [x] In `create`: after `client.transaction.create`, `writeAuditLog(..., 'created', ..., buildCreatedAuditPayload(created))`.
   - [x] In `update`: after successful update, `writeAuditLog(..., 'updated', ..., serializeUpdatesPayload(data))`.
   - [x] In `updateWithVersion`: after successful update, same as `update`.

3. **Serialization**
   - [x] `buildCreatedAuditPayload(created)`: minimal snapshot (id, listingId, buyerId, sellerId, status, requiredActor, paymentExpiresAt, createdAt) with dates as ISO strings.
   - [x] `serializeUpdatesPayload(updateData)`: `JSON.parse(JSON.stringify(updateData))` for JSON-safe payload.

4. **Tests**
   - [ ] Unit/integration: create transaction → one audit row with `action: 'created'`, `changedBy` from ctx.
   - [ ] Unit/integration: update transaction → one audit row with `action: 'updated'`, payload containing the updates; `updateWithVersion` same.
   - [ ] When `ctx.userId` is undefined, `changedBy` is `'system'`.

5. **Docs**
   - [x] This plan doc is the spec.

---

## 6. Optional: admin API to read audit log

Out of scope for this plan. Later you could add an endpoint (e.g. `GET /admin/transactions/:id/audit-log`) that returns `TransactionAuditLog[]` for a given transaction, with pagination if needed.

---

## 7. Summary

| Item | Detail |
|------|--------|
| **Where** | `TransactionsRepository` only (create, update, updateWithVersion). |
| **Table** | `transaction_audit_logs`: id, transactionId, action, changedAt, changedBy, payload. |
| **First record** | On create, with `action = 'created'`. |
| **No “before”** | Only store created snapshot or update payload; no extra read. |
| **Who** | `ctx.userId ?? 'system'`. |
| **Failure** | Log and continue (Option A). |
