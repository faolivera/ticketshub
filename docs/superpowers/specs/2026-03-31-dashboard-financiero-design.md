# Spec: Dashboard Financiero / Analytics

**Date:** 2026-03-31
**Status:** Approved

## Context

The existing admin dashboard shows operational counts (pending events, open tickets, etc.) but has no financial metrics. There is no way to see GMV, revenue, or breakdowns by payment method, event, or seller. This is a separate read-only analytics page.

## Scope

- New page `/admin/analytics` with period selector and financial aggregates
- Read-only: no actions, no export
- Covers completed/in-progress transactions only (excludes Cancelled and Refunded)
- Top 10 breakdowns for events and sellers; all payment methods shown

## Backend

### New Endpoint

`GET /admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Defaults:** `from` = 30 days ago, `to` = today (server time).

**Included transaction statuses** (represent concretized sales):
`Completed`, `DepositHold`, `TransferringFund`, `TicketTransferred`, `PaymentReceived`

**Excluded statuses:** `PendingPayment`, `PaymentPendingVerification`, `Cancelled`, `Refunded`, `Disputed`

**Response type** (add to `admin.api.ts`):
```typescript
interface GetAnalyticsResponse {
  period: {
    from: string  // ISO date
    to: string
  }
  summary: {
    gmv: number                  // sum of totalAmount for included transactions
    revenue: number              // sum of (buyerPlatformFee + sellerPlatformFee) for included transactions
    transactionCount: number
    avgTransactionAmount: number // gmv / transactionCount, 0 if no transactions
  }
  byPaymentMethod: Array<{
    methodId: string
    methodName: string
    gmv: number
    count: number
    percentageOfGmv: number      // (methodGmv / totalGmv) * 100, rounded to 1 decimal
  }>                             // ordered by gmv desc
  topEvents: Array<{
    eventId: string
    eventName: string
    gmv: number
    count: number
  }>                             // top 10 by gmv
  topSellers: Array<{
    sellerId: string
    sellerName: string
    gmv: number
    count: number
  }>                             // top 10 by gmv
}
```

**Implementation notes:**
- Single repository method `getAnalytics(ctx, from, to)` in `admin.repository.ts`
- Use Prisma `groupBy` or raw aggregation queries — avoid loading individual transactions into memory
- `revenue` = sum of `buyerPlatformFee + sellerPlatformFee` stored in the transaction record (not recalculated)

### Admin controller

Add to `admin.controller.ts`:
```typescript
@Get('analytics')
async getAnalytics(
  @Ctx() ctx: Context,
  @Query('from') from?: string,
  @Query('to') to?: string,
): Promise<ApiResponse<GetAnalyticsResponse>>
```

## Frontend

### New page

**Route:** `/admin/analytics`
**File:** `frontend/src/app/pages/admin/Analytics.tsx`

Add link in admin sidebar navigation.

### Layout

**Period selector (top):**
- Date range picker: "Desde" and "Hasta" inputs
- Shortcut buttons: "Esta semana" · "Este mes" · "Últimos 3 meses"
- "Aplicar" button triggers fetch; page shows loading state during fetch

**Summary row — 4 stat cards:**
| Card | Value | Format |
|---|---|---|
| GMV Total | `summary.gmv` | Argentine format, no decimals (browse context) |
| Revenue Total | `summary.revenue` | Argentine format, no decimals |
| Transacciones | `summary.transactionCount` | Integer |
| Ticket Promedio | `summary.avgTransactionAmount` | Argentine format, no decimals |

**Breakdowns — 3 tables:**

All tables share the same structure: name column + GMV column + quantity column. For payment methods, add a % column.

Tables are arranged in a 3-column grid on desktop, stacked on mobile.

| Table | Rows | Columns |
|---|---|---|
| Por método de pago | All methods | Método · GMV · Cant. · % del total |
| Top eventos | Top 10 | Evento · GMV · Cant. |
| Top vendedores | Top 10 | Vendedor · GMV · Cant. |

Vendor names in the top sellers table link to `/admin/sellers/:id`.
Event names in the top events table link to `/admin/events/:id`.

**Empty state:** if `transactionCount === 0`, show "No hay transacciones en el período seleccionado" and hide the breakdown tables.

## Out of Scope

- Charts or trend graphs
- CSV/Excel export
- Real-time updates (page requires manual re-fetch via "Aplicar")
- Breakdown by buyer
- Refunded/cancelled transaction analytics (separate future feature)
