# Spec: Disputas + Reembolsos

**Date:** 2026-03-31
**Status:** Approved

## Context

The current dispute flow relies on manually editing transaction status and handling support tickets separately. The `Disputed` transaction status already exists and blocks seller payouts. `markDisputed` and `resolveDisputeInFavorOfSeller` are already implemented in `transactions.service.ts`. What's missing is a structured admin resolution UI and the backend endpoints for buyer-wins and partial resolution.

## Scope

- Admin can resolve disputes with 3 outcomes: buyer wins, seller wins, partial
- Refunds are always manual (admin transfers externally and records it in the system)
- Dispute initiation by buyer from the transaction page is out of scope (already exists via support ticket flow)
- Automated gateway refunds are out of scope (future work)

## Backend

### Database

Add nullable JSON column to `Transaction`:

```prisma
disputeResolutionDetail Json? // stores resolution amounts and notes
```

Migration name: `add_dispute_resolution_detail`

### Existing infrastructure (confirmed)

- `DisputeResolution` enum in `support.domain.ts`: `BuyerWins`, `SellerWins`, `SplitResolution`, `NoResolution`
- `support.service.resolveDispute(ctx, ticketId, adminId, body)` — already handles `BuyerWins` (calls `transactionsService.refundTransaction`) and `SellerWins` (calls `transactionsService.resolveDisputeSellerWins`)
- `SplitResolution` is defined but not yet implemented in the service (comment: "could be implemented later")
- Support tickets link to transactions via `transactionId` field

### New Endpoint

`POST /admin/transactions/:id/resolve-dispute`

This endpoint finds the support ticket linked to the transaction and delegates to `supportService.resolveDispute`, which handles transaction transitions, ticket closure, and notification emission.

**Request body:**
```typescript
{
  resolution: 'BuyerWins' | 'SellerWins' | 'SplitResolution'  // matches DisputeResolution enum
  buyerAmount?: number    // required if resolution === 'SplitResolution', must be >= 0
  sellerAmount?: number   // required if resolution === 'SplitResolution', must be >= 0
  notes: string           // required for all resolutions
}
```

**Validations:**
- Transaction must be in `Disputed` status — throw `BadRequestException` otherwise
- A support ticket linked to the transaction must exist — throw `BadRequestException` if not found
- `notes` must be non-empty
- If `SplitResolution`: both `buyerAmount` and `sellerAmount` required, each `>= 0`, neither may exceed `transaction.totalAmount`
- `buyerAmount + sellerAmount` may be less than `totalAmount` — remainder stays in the platform

**Resolution logic:**

| Resolution | Handled by | Transaction transition |
|---|---|---|
| `BuyerWins` | existing `supportService.resolveDispute` | `Disputed` → `Refunded` |
| `SellerWins` | existing `supportService.resolveDispute` | `Disputed` → `DepositHold` (scheduler releases normally) |
| `SplitResolution` | **new** — to be implemented | `Disputed` → `Refunded`, stores `{ buyerAmount, sellerAmount, notes }` in `disputeResolutionDetail` |

### Changes to support.service.ts

Implement `SplitResolution` branch (currently a stub):
- Add `buyerAmount` and `sellerAmount` to the `resolveDispute` input shape
- On `SplitResolution`: transition transaction to `Refunded`, save amounts in `disputeResolutionDetail` JSON field

### Changes to transactions.domain.ts / Prisma schema

Add nullable JSON column to `Transaction`:

```prisma
disputeResolutionDetail Json? // { buyerAmount, sellerAmount, notes } for SplitResolution
```

Migration name: `add_dispute_resolution_detail`

### Admin controller

Add to `admin.controller.ts`:
```typescript
@Post('transactions/:id/resolve-dispute')
async resolveDispute(
  @Ctx() ctx: Context,
  @User() user: AuthenticatedUserPublicInfo,
  @Param('id') id: string,
  @Body() body: AdminResolveDisputeDto,
): Promise<ApiResponse<ResolveDisputeResponse>>
```

Logic: find support ticket by `transactionId`, call `supportService.resolveDispute(ctx, ticketId, user.id, body)`.

Add `AdminResolveDisputeDto` to `admin.api.ts`.

## Frontend

### Resolution block in TransactionManagement

When a transaction detail is expanded and `status === 'Disputed'`, render a resolution panel below the transaction info:

**UI structure:**
1. Three option buttons: "Favor del comprador" · "Favor del vendedor" · "Parcial"
2. Clicking any option opens a confirmation modal:
   - `buyer_wins` / `seller_wins`: textarea for notes (required)
   - `partial`: input for buyer amount + input for seller amount + textarea for notes (all required)
3. Confirm button is disabled until all required fields are filled
4. On success: transaction status refreshes in place, success toast shown

**Validation in UI:**
- Amounts must be numeric and ≥ 0
- Amounts must not exceed the transaction total

### No new page or route required

Resolution lives entirely within the existing `TransactionManagement` expanded row.

## Out of Scope

- Automated refund via gateway API (future)
- Dispute initiation UI changes
- Partial refund to wallet (currently always external/manual)
- Notification to buyer/seller on resolution (future)
