# TicketsHub — Claude Code Reference

## Project Overview

TicketsHub is a ticket marketplace. Monorepo with:
- `backend/` — NestJS + TypeScript
- `frontend/` — React + Vite + TypeScript + TailwindCSS

---

## Language Convention

**All code and documentation must be written in English.** This includes variable/function/class names, comments, commit messages, API endpoints, and error messages.

The only exception is user-facing content that requires localization (`frontend/src/i18n/locales/`).

---

## Architecture

### Backend

**Stack**: NestJS, TypeScript (strict), Zod validation, Prisma ORM, PostgreSQL

**Module structure** (domain-driven):
```
modules/[domain]/
  [domain].api.ts          # Request/Response DTOs (API contract types)
  [domain].domain.ts       # Business entities (NOT DTOs)
  [domain].controller.ts
  [domain].service.ts
  [domain].repository.ts
  [domain].module.ts
```

**Layer rules:**
- **Controllers**: auth/authorization only, basic input validation, delegate to service. No business logic, no DB calls.
- **Services**: all business logic. May only use their own module's repository. Cross-module communication goes through other modules' services (never their repositories).
- **Repositories**: data access only. Never injected by other modules' services directly.

**Controller response type**: always `Promise<ApiResponse<T>>` from `@/common/types/api`.

```typescript
// Response type naming: {Verb}{Resource}Response
async getAll(): Promise<ApiResponse<GetAllEventsResponse>> {
  return { success: true, data: await this.service.findAll() };
}
```

**API contract types** go in `{module}.api.ts`, not `{module}.domain.ts`.

### Frontend

**Stack**: React 18+, Vite, TypeScript, TailwindCSS, shadcn/ui

**Structure:**
```
src/
  app/
    components/         # Reusable components
      ui/               # shadcn/ui components
    pages/              # Routes/views
    contexts/           # React contexts
  i18n/locales/         # en.json, es.json
  styles/
```

### BFF Pattern (Frontend–Backend Integration)

If a frontend route needs data from **more than one domain module**, the composition must live in `backend/src/modules/bff/`.

- Domain modules must never import each other to serve frontend needs.
- All BFF endpoints live under `@Controller('api')` in `bff.controller.ts`.

```
Frontend needs: listing data + seller name
  ❌ Bad:  GET /api/tickets  AND  GET /api/sellers/:id
  ✅ Good: GET /api/listings?eventId=  (BFF composes it)
```

---

## Key Rules

### Logging (mandatory)

Use `ContextLogger` everywhere. Never use `console.log`, `console.error`, or `console.warn` in application code.

```typescript
private readonly logger = new ContextLogger(MyService.name);
// With ctx available:
this.logger.debug(ctx, 'methodName', { id });
// Without ctx:
this.logger.error(ON_APP_INIT_CTX, 'message', error);
```

- Every repository method must log at least once (DEBUG at entry when `ctx` is available).
- Every `try/catch` that handles an error MUST log it. Never silently swallow errors.
- Exception: `console.log`/`console.error` is acceptable in scripts (`scripts/`) before `process.exit`.

### Prisma migrations (critical)

**Always use `prisma migrate dev` to create and apply migrations.** Never create migration files manually and never use `prisma generate` alone — it only regenerates the TypeScript client from the schema, it does NOT apply SQL to the database.

```bash
# ✅ Correct: creates the SQL file AND applies it to the DB AND regenerates the client
npx prisma migrate dev --name describe_the_change

# ❌ Wrong: only regenerates the TypeScript client, DB is untouched
npx prisma generate

# ❌ Wrong: tells Prisma "I already applied this" but the SQL was never run
npx prisma migrate resolve --applied <migration_name>
```

**`prisma migrate resolve --applied` is only for when the SQL was already run manually on the DB first.** Using it before running the SQL will cause runtime errors (`The column "(not available)" does not exist`) that unit tests won't catch because they mock the repository.

**If `prisma migrate dev` fails due to a shadow database error**, fix the underlying shadow DB issue — do not work around it with `resolve --applied`. The shadow DB validates migrations; bypassing it hides real problems.

### Raw SQL with Prisma (critical)

Column names in `$queryRaw`/`$executeRaw` must match **actual DB column names**, not Prisma field names.

- If the field has `@map("snake_case")` → use that snake_case name.
- If no `@map()` → the column is camelCase; use double quotes in SQL: `"listingId"`.

```typescript
// ✅ Correct
WHERE "listingId" = ${id}   -- camelCase field, no @map()
WHERE locked_by = ${owner}  -- has @map("locked_by")

// ❌ Wrong
WHERE listing_id = ${id}    -- ERROR: column does not exist
```

Unit tests with mocks will NOT catch these errors. Only integration tests against a real DB will.

### TypeScript

All methods in controllers, services, and repositories must have **explicit return type annotations**.

```typescript
// ✅
async findAll(ctx: Context): Promise<User[]> { ... }
// ❌
async findAll(ctx: Context) { ... }
```

### No backward compatibility

When making changes, migrate everything. Don't keep old models, old endpoints, or compatibility shims.

---

## Unit Testing (mandatory for services)

All service layer code must have accompanying unit tests. Tests cannot be skipped.

**Test file location** (mirrors module structure):
```
backend/src/test/unit/modules/[domain]/[domain].service.spec.ts
```

**Minimum per public service method:**
- Happy path
- Not found (when applicable)
- Authorization/forbidden (when applicable)
- Validation failure (when applicable)
- Conflict scenarios (when applicable)

**Run tests:**
```bash
cd backend
npm test
npm test -- --testPathPattern="service-name.spec"
npm test -- --coverage
```

---

## Frontend Conventions

### Components

```tsx
// Functional component with typed props
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}
export const MyComponent: FC<MyComponentProps> = ({ title, onClick }) => { ... };
```

- Components: `PascalCase.tsx`
- Hooks: `use[Name].ts`
- Props interfaces: suffix `Props`

### Page content width

For pages with `AppHeader` (non-admin): wrap content in `PageContentMaxWidth` from `@/app/components/PageContentMaxWidth`. This gives 1280px max, centered, 24px horizontal padding — aligned with the header row.

### Mobile-first

All components must be mobile-friendly. Write base styles for mobile, add breakpoints for larger screens. Touch targets minimum 44×44px.

```tsx
<div className="flex flex-col gap-2 p-4 md:flex-row md:gap-4 md:p-6">
```

Use `useIsMobile()` from `@/hooks/use-mobile` for conditional logic, not for styles (use Tailwind for styles).

### i18n

Every new user-facing text string must have translations in both `en.json` and `es.json`.

```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
```

### Conditional classes

```tsx
import { cn } from './ui/utils';
<button className={cn("btn", isActive && "btn-active")} />
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (backend) | `kebab-case` | `user-profile.service.ts` |
| Files (frontend) | `PascalCase.tsx` | `EventCard.tsx` |
| Classes | `PascalCase` | `UserProfileService` |
| Methods | `camelCase` | `findByEmail` |
| Module files | `{module}.{type}.ts` | `users.api.ts`, `users.domain.ts` |
| Response types | `{Verb}{Resource}Response` | `GetAllUsersResponse` |

---

## Error Handling

```typescript
import { BadRequestException, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';

throw new BadRequestException('Invalid input');
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
throw new HttpException('Custom error', HttpStatus.INTERNAL_SERVER_ERROR);
```

---

## Available Decorators & Guards (backend)

**Decorators**: `@Ctx()`, `@User()`, `@Roles(...)`, `@ValidateResponse()`

**Guards**: `JwtAuthGuard`, `OptionalJwtAuthGuard`, `RolesGuard`

---

## Design System

Full reference: `ticketshub-design-system-v2.md`

### Style approach

UI components use **inline style objects**, not Tailwind classes. CSS globals (via `<style>` tag) only for grid responsive, media queries, and `:hover` pseudo-selectors.

```js
const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };  // body/UI
const E = { fontFamily: "'DM Serif Display', serif" };        // headings/editorial
```

### Color tokens

```js
// Brand
const V        = "#6d28d9";   // CTAs, browse prices, checkout total, active pills
const VLIGHT   = "#f0ebff";   // active pill bg, active dropdown bg
const BLUE     = "#1e3a5f";   // trust badges, support links
const BLIGHT   = "#e4edf7";   // "Compra garantizada" badge bg

// Base
const DARK     = "#0f0f1a";   // headings, body text, checkout line items
const MUTED    = "#6b7280";   // subtitles, metadata, labels
const BG       = "#f3f3f0";   // page background, input background
const CARD     = "#ffffff";   // cards, search box, hero box
const BORDER   = "#e5e7eb";   // default borders, card borders
const BORD2    = "#d1d5db";   // inactive pill borders, secondary buttons

// Semantic — use ONLY these, never invent new green/amber/pink values
const SUCCESS        = "#16a34a";  const SUCCESS_LIGHT  = "#dcfce7";  const SUCCESS_BORDER = "#bbf7d0";
const PENDING        = "#d97706";  const PENDING_LIGHT  = "#fef3c7";  const PENDING_BORDER = "#fde68a";
const URGENT         = "#be185d";  const URGENT_LIGHT   = "#fce7f3";  const URGENT_BORDER  = "#fbcfe8";
const INFO           = "#2563eb";  const INFO_LIGHT     = "#eff6ff";  const INFO_BORDER    = "#bfdbfe";
```

Cancelled/inactive states: use `MUTED` on white background — no special color.

### Typography hierarchy

| Level | Name | Family | Size | Weight | Color |
|-------|------|--------|------|--------|-------|
| T1 | Display Hero | DM Serif Display | `clamp(24px,3.2vw,40px)` | 400 | white |
| T2 | Page Title | DM Serif Display | `28px` | 400 | DARK |
| T3 | Section Heading | DM Serif Display | `clamp(20px,2.4vw,26px)` | 400 | DARK |
| T4 | Card/Panel Heading | Plus Jakarta Sans | `16px` | 700 | DARK |
| T5 | Card Title | Plus Jakarta Sans | `14px` | 700 | DARK |
| T6 | Body | Plus Jakarta Sans | `14px` | 400 | DARK/MUTED |
| T7 | Label/Eyebrow | Plus Jakarta Sans | `11px` | 700 uppercase | MUTED |
| T8 | Meta/Caption | Plus Jakarta Sans | `12–13px` | 400–500 | MUTED |
| T9 | Nav/Links | Plus Jakarta Sans | `13.5px` | 500 | MUTED |

**Rule**: DM Serif Display for titles that give identity (T1–T3). Plus Jakarta Sans for everything that organizes and explains (T4–T9).

### Price typography (critical)

| Context | Size | Weight | Color | Decimals |
|---------|------|--------|-------|----------|
| Browse price (cards, event header) | `17px` | 800 | **V** (purple) | No — `$180.000` |
| Listing card "TOTAL A PAGAR" | `22–24px` | 800 | **DARK** | No |
| Checkout total | `22px` | 800 | **V** (purple) | Yes — `$180.000,00` |
| Checkout line items (value) | `14px` | 600 | **DARK** | Yes |

Number format: `.` as thousands separator, `,` as decimal (Argentine standard).

### Border radii

| Element | Radius |
|---------|--------|
| Hero box | `20px` |
| Search + filters box | `16px` |
| Event cards | `14px` |
| Primary button (CTA) | `10px` |
| Inputs | `10px` |
| Pills / chips | `100px` |
| Status badges (SUCCESS, PENDING, URGENT) | `100px` |

### Shadows

| Element | Shadow |
|---------|--------|
| Cards (rest) | `0 1px 4px rgba(0,0,0,0.05)` |
| Cards (hover) | `0 10px 28px rgba(109,40,217,0.12), 0 2px 6px rgba(0,0,0,0.06)` |
| Primary CTA button | `0 4px 18px rgba(109,40,217,0.28)` |
| Input on focus | `0 0 0 3px rgba(109,40,217,0.1)` |

### Anti-patterns

- ❌ No Inter, Roboto, Arial, or System UI fonts
- ❌ No dark backgrounds outside the hero box
- ❌ No saturated color gradients outside the hero
- ❌ No 1:1 image aspect ratio on cards — use 4:3
- ❌ No separate date and time fields — always together: `"28 Mar · 21:00hs"`
- ❌ No `localStorage` or `sessionStorage`
- ❌ No Plus Jakarta Sans for H1 of utility pages — always DM Serif Display (T2)
- ❌ No purple (`V`) for prices in individual listing cards — only for browse prices and checkout totals
- ❌ No new green, amber, or pink values — use only SUCCESS / PENDING / URGENT tokens
- ❌ No decimals in browse prices — only in checkout and transaction detail contexts
- ❌ No DM Serif Display for functional headings inside cards (T4) — those use Plus Jakarta Sans 700
- ❌ No merging search box and filters into the hero — they are separate elements
