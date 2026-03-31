# Spec: Vista de Vendedor

**Date:** 2026-03-31
**Status:** Approved

## Context

Admins currently have no consolidated view of a seller's activity. Investigating a problematic seller requires manually cross-referencing UserManagement, TransactionManagement, and identity verification pages. This spec introduces a dedicated seller profile page for admins.

## Scope

- New page `/admin/sellers/:userId` with seller stats and quick actions
- Stats: total sales (count + amount), open disputes, historical disputes, wallet balance
- Quick actions: suspend/enable, manually verify identity
- No risk limit overrides per seller (global rules apply to all)
- Entry points: UserManagement row button + seller name link in TransactionManagement

## Backend

### New Endpoint

`GET /admin/sellers/:userId`

**Validations:**
- User must exist — throw `NotFoundException` otherwise
- User must have seller role — throw `BadRequestException` if not a seller

**Response type** (add to `admin.api.ts`):
```typescript
interface GetSellerProfileResponse {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    status: UserStatus
    role: UserRole
    isPhoneVerified: boolean
    isDniVerified: boolean
    isBankAccountVerified: boolean
    createdAt: string
  }
  identityVerification: {
    status: IdentityVerificationStatus | null
    rejectionReason: string | null
  }
  bankAccount: {
    status: BankAccountStatus | null
    holderName: string | null
    cbu: string | null
    alias: string | null
  }
  stats: {
    totalSales: number           // completed transactions as seller
    totalSalesAmount: number     // sum of totalAmount for completed transactions as seller
    openDisputes: number         // transactions currently in Disputed status where seller is the seller
    historicalDisputes: number   // all transactions ever in Disputed status for this seller
    walletBalance: number        // current wallet balance
  }
  recentTransactions: Array<{
    id: string
    status: TransactionStatus
    totalAmount: number
    buyerName: string
    eventName: string
    createdAt: string
  }>                             // last 20 transactions as seller, ordered by createdAt desc
}
```

**Included statuses for `totalSales`:** `Completed`, `DepositHold`, `TransferringFund`, `TicketTransferred`, `PaymentReceived`

**Implementation:** single method `getSellerProfile(ctx, userId)` in `admin.repository.ts`. Compose existing user, identity verification, bank account, wallet, and transaction queries. No new tables or migrations needed.

### Admin controller

Add to `admin.controller.ts`:
```typescript
@Get('sellers/:userId')
async getSellerProfile(
  @Ctx() ctx: Context,
  @Param('userId') userId: string,
): Promise<ApiResponse<GetSellerProfileResponse>>
```

**Quick actions reuse existing endpoints:**
- Suspend/enable: `PATCH /admin/users/:id` (already exists)
- Manually verify identity: existing identity verification admin endpoint

## Frontend

### New page

**Route:** `/admin/sellers/:id`
**File:** `frontend/src/app/pages/admin/SellerProfile.tsx`

### Layout

**Header section:**
- Seller name (T2 — DM Serif Display)
- Status badge (Enabled / Disabled / Suspended)
- Two action buttons: "Suspender" / "Habilitar" (toggles based on current status) · "Verificar identidad" (disabled if already verified)
- Confirmation dialog required before suspend/enable action

**Stats row — 5 cards:**
| Card | Value |
|---|---|
| Ventas totales | `stats.totalSales` (integer) |
| Monto vendido | `stats.totalSalesAmount` (Argentine format) |
| Disputas abiertas | `stats.openDisputes` |
| Disputas históricas | `stats.historicalDisputes` |
| Balance wallet | `stats.walletBalance` (Argentine format) |

Disputes cards use `URGENT` color token if `openDisputes > 0`.

**Verification section:**
Two info rows (identity + bank account), each showing current status badge and a link to the relevant admin page if status is `pending`.

**Recent transactions table:**
Columns: Fecha · Evento · Comprador · Monto · Estado

Each row links to the transaction in `TransactionManagement` (`/admin/transactions?highlight=:id` or similar).

### Entry points

**From UserManagement:**
- Add a "Ver perfil de vendedor" button/icon in each user row, visible only if `user.role === 'Seller'`
- Navigates to `/admin/sellers/:userId`

**From TransactionManagement:**
- Seller name in the transaction detail becomes a clickable link to `/admin/sellers/:sellerId`

## Out of Scope

- Per-seller risk limit overrides
- Seller listings view (tickets for sale) — use existing EventManagement
- Reviews/ratings display
- Messaging seller from admin panel
