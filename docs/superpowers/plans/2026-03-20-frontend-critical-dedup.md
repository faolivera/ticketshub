# Frontend Critical Deduplication Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar archivos duplicados y extraer funciones utilitarias repetidas a ubicaciones compartidas.

**Architecture:** Tres cambios independientes y seguros: (1) eliminar el `WizardProgress.tsx` duplicado en `/steps/`, (2) agregar helpers de display a `format-currency.ts` y reemplazar las ~8 definiciones locales de `fmt()`, (3) crear `string-utils.ts` con `getInitials` canónico y reemplazar las 4 definiciones locales.

**Tech Stack:** React + TypeScript, Vite (`npm run build` para verificar), sin test suite de frontend configurada.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Eliminar | `frontend/src/app/components/sell-listing-wizard/steps/WizardProgress.tsx` |
| Modificar | `frontend/src/lib/format-currency.ts` |
| Modificar | `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx` |
| Modificar | `frontend/src/app/components/sell-listing-wizard/steps/StepPriceAndConditions.tsx` |
| Modificar | `frontend/src/app/pages/SellListingWizard.tsx` |
| Modificar | `frontend/src/app/pages/EditListing.tsx` |
| Modificar | `frontend/src/app/pages/my-tickets/MyTicketsPage.tsx` |
| Modificar | `frontend/src/app/pages/my-tickets/TransactionActionRequiredCard.tsx` |
| Modificar | `frontend/src/app/pages/seller-dashboard/SellerDashboardPage.tsx` |
| Modificar | `frontend/src/app/pages/seller-dashboard/SellerHistoryPage.tsx` |
| Crear | `frontend/src/lib/string-utils.ts` |
| Modificar | `frontend/src/app/components/UserAvatar.tsx` |
| Modificar | `frontend/src/app/components/EventTicketCard.tsx` |
| Modificar | `frontend/src/app/pages/Event.jsx` |
| Modificar | `frontend/src/app/pages/Checkout.jsx` |

---

## Task 1: Eliminar WizardProgress duplicado

El archivo `steps/WizardProgress.tsx` es byte-for-byte idéntico al de su directorio padre. No tiene ningún import que lo referencie (grep confirma que `sell-listing-wizard/index.ts` solo exporta desde `./WizardProgress`, no desde `./steps/WizardProgress`).

**Files:**
- Delete: `frontend/src/app/components/sell-listing-wizard/steps/WizardProgress.tsx`

- [ ] **Step 1: Confirmar que nadie importa el archivo duplicado**

```bash
grep -r "steps/WizardProgress" frontend/src
```
Esperado: sin resultados.

- [ ] **Step 2: Eliminar el archivo duplicado**

```bash
rm frontend/src/app/components/sell-listing-wizard/steps/WizardProgress.tsx
```

- [ ] **Step 3: Verificar que el build sigue pasando**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Esperado: build exitoso sin errores.

- [ ] **Step 4: Commit**

```bash
git add -u frontend/src/app/components/sell-listing-wizard/steps/WizardProgress.tsx
git commit -m "chore: remove duplicate WizardProgress from steps/ folder"
```

---

## Task 2: Extraer `fmt()` a `format-currency.ts`

Hay ~8 definiciones locales del mismo helper que stripea los centavos cero. Se agregan dos funciones públicas a `format-currency.ts` y se reemplazan todas las definiciones locales.

Hay dos variantes según el origen del monto:
- **Desde cents** (`formatCurrency` internamente): usada en `MyTicketsPage`, `SellerDashboardPage`, `SellerHistoryPage`, `TransactionActionRequiredCard`.
- **Desde unidades decimales** (`formatCurrencyFromUnits` internamente): usada en `SellListingWizard`, `StepReviewAndPublish`, `StepPriceAndConditions` (como `fmtUnits`).

`EditListing.tsx` tiene una variante distinta con `maximumFractionDigits: 0` hardcodeado en `es-AR` — se migra igualmente a la función canónica (el comportamiento es equivalente para montos enteros).

**Files:**
- Modify: `frontend/src/lib/format-currency.ts`
- Modify: `frontend/src/app/pages/SellListingWizard.tsx:77-79`
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx:30-33`
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepPriceAndConditions.tsx:34-36`
- Modify: `frontend/src/app/pages/EditListing.tsx:35-37`
- Modify: `frontend/src/app/pages/my-tickets/MyTicketsPage.tsx:41-43`
- Modify: `frontend/src/app/pages/my-tickets/TransactionActionRequiredCard.tsx`
- Modify: `frontend/src/app/pages/seller-dashboard/SellerDashboardPage.tsx:49-51`
- Modify: `frontend/src/app/pages/seller-dashboard/SellerHistoryPage.tsx`

- [ ] **Step 1: Agregar las dos funciones a `format-currency.ts`**

Agregar al final del archivo `frontend/src/lib/format-currency.ts`:

```typescript
/**
 * Like formatCurrency but strips trailing ".00" or ",00" for cleaner display.
 * Use for amounts stored in cents (e.g. from the API).
 */
export function formatCurrencyDisplay(amountInCents: number, currency: string): string {
  return formatCurrency(amountInCents, currency).replace(/[,.]00$/, '');
}

/**
 * Like formatCurrencyFromUnits but strips trailing ".00" or ",00" for cleaner display.
 * Use for amounts already in decimal units (e.g. price * quantity).
 */
export function formatCurrencyFromUnitsDisplay(amount: number, currency: string): string {
  return formatCurrencyFromUnits(amount, currency).replace(/[,.]00$/, '');
}
```

- [ ] **Step 2: Verificar que el archivo compila bien**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores en `lib/format-currency.ts`.

- [ ] **Step 3: Reemplazar `fmt()` en `SellListingWizard.tsx`**

Leer el archivo para confirmar contexto, luego:
- Eliminar la definición local `function fmt(...)` (líneas 77-79)
- Agregar `formatCurrencyFromUnitsDisplay` al import existente de `@/lib/format-currency`
- Reemplazar todas las llamadas `fmt(` por `formatCurrencyFromUnitsDisplay(`

- [ ] **Step 4: Reemplazar `fmt()` en `StepReviewAndPublish.tsx`**

- Eliminar la definición local `function fmt(...)` (líneas 30-33)
- Agregar `formatCurrencyFromUnitsDisplay` al import de `@/lib/format-currency`
- Reemplazar llamadas `fmt(` por `formatCurrencyFromUnitsDisplay(`

- [ ] **Step 5: Reemplazar `fmtUnits()` en `StepPriceAndConditions.tsx`**

- Eliminar la definición local `function fmtUnits(...)` (líneas 34-36)
- Agregar `formatCurrencyFromUnitsDisplay` al import de `@/lib/format-currency`
- Reemplazar llamadas `fmtUnits(` por `formatCurrencyFromUnitsDisplay(`

- [ ] **Step 6: Reemplazar `fmt()` en `EditListing.tsx`**

- Eliminar la definición local `function fmt(...)` (líneas 35-37)
- Agregar `formatCurrencyFromUnitsDisplay` al import de `@/lib/format-currency`
- Reemplazar llamadas `fmt(` por `formatCurrencyFromUnitsDisplay(`

> Nota: La implementación original usaba `maximumFractionDigits: 0`. La nueva función usa la misma lógica que el resto del sistema (strip `.00`). Ambas producen el mismo resultado para montos enteros.

- [ ] **Step 7: Reemplazar `fmt()` en los cuatro archivos de cents**

Para cada uno de estos archivos:
- `frontend/src/app/pages/my-tickets/MyTicketsPage.tsx`
- `frontend/src/app/pages/my-tickets/TransactionActionRequiredCard.tsx`
- `frontend/src/app/pages/seller-dashboard/SellerDashboardPage.tsx`
- `frontend/src/app/pages/seller-dashboard/SellerHistoryPage.tsx`

Pasos iguales: eliminar definición local de `fmt`, agregar `formatCurrencyDisplay` al import de `@/lib/format-currency`, reemplazar `fmt(` por `formatCurrencyDisplay(`.

- [ ] **Step 8: Verificar build completo**

```bash
cd frontend && npm run build 2>&1 | tail -30
```
Esperado: build exitoso sin errores de tipo.

- [ ] **Step 9: Confirmar que no quedan definiciones locales de `fmt` en archivos TypeScript**

```bash
grep -rn "^function fmt\|^const fmt" frontend/src --include="*.ts" --include="*.tsx"
```
Esperado: sin resultados.

> Nota: `Event.jsx` tiene una definición `const fmt = (n) => "$" + Number(n).toLocaleString("es-AR")` con una firma distinta (sin currency, hardcodeada a ARS). Se excluye de esta tarea porque será migrada durante la conversión JSX→TSX.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/format-currency.ts \
  frontend/src/app/pages/SellListingWizard.tsx \
  frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx \
  frontend/src/app/components/sell-listing-wizard/steps/StepPriceAndConditions.tsx \
  frontend/src/app/pages/EditListing.tsx \
  frontend/src/app/pages/my-tickets/MyTicketsPage.tsx \
  frontend/src/app/pages/my-tickets/TransactionActionRequiredCard.tsx \
  frontend/src/app/pages/seller-dashboard/SellerDashboardPage.tsx \
  frontend/src/app/pages/seller-dashboard/SellerHistoryPage.tsx
git commit -m "refactor: centralize fmt() into formatCurrencyDisplay/FromUnitsDisplay helpers"
```

---

## Task 3: Extraer `getInitials()` a `string-utils.ts`

Hay 4 definiciones locales. La versión más robusta es la de `Event.jsx` (maneja strings vacíos, trim, nombre de una palabra). Se crea `lib/string-utils.ts` con esa implementación en TypeScript y se reemplaza en los 4 archivos.

**Files:**
- Create: `frontend/src/lib/string-utils.ts`
- Modify: `frontend/src/app/components/UserAvatar.tsx:13-20`
- Modify: `frontend/src/app/components/EventTicketCard.tsx`
- Modify: `frontend/src/app/pages/Event.jsx`
- Modify: `frontend/src/app/pages/Checkout.jsx`

- [ ] **Step 1: Crear `string-utils.ts`**

Crear `frontend/src/lib/string-utils.ts`:

```typescript
/**
 * Returns up to 2 initials from a display name.
 * Uses first and last word initials when available.
 * Falls back to first two characters for single-word names.
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
```

- [ ] **Step 2: Verificar que el archivo compila**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "string-utils"
```
Esperado: sin errores.

- [ ] **Step 3: Reemplazar en `UserAvatar.tsx`**

- Eliminar la definición local `function getInitials(...)` (líneas 13-20)
- Agregar import: `import { getInitials } from '@/lib/string-utils';`

> Nota de comportamiento: la implementación original en `UserAvatar.tsx` no guarda contra strings vacíos (lanzaría `TypeError` si `name` es `""` o solo espacios). La versión canónica retorna `'??'` en ese caso — es una mejora, no un cambio regresivo.

- [ ] **Step 4: Reemplazar en `EventTicketCard.tsx`**

- Leer el archivo para ver la definición exacta
- Eliminar la definición local de `getInitials`
- Agregar import: `import { getInitials } from '@/lib/string-utils';`

> Nota de comportamiento: la implementación original en `EventTicketCard.tsx` retorna `"?"` (un solo signo) para input vacío. La versión canónica retorna `"??"`. El cambio es inocuo visualmente.

- [ ] **Step 5: Reemplazar en `Event.jsx`**

- Eliminar la definición local `function getInitials(...)` (líneas 21-26)
- Agregar import al bloque de imports existentes: `import { getInitials } from '@/lib/string-utils';`
  (es un archivo `.jsx` — el import de módulo TS funciona igual)

- [ ] **Step 6: Reemplazar en `Checkout.jsx`**

- Leer el archivo para ver la definición exacta de `getInitials`
- Eliminar la definición local
- Agregar import: `import { getInitials } from '@/lib/string-utils';`

- [ ] **Step 7: Verificar build y que no quedan definiciones locales**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
```bash
grep -rn "^function getInitials\|^const getInitials" frontend/src
```
Esperado: build exitoso, grep sin resultados.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/string-utils.ts \
  frontend/src/app/components/UserAvatar.tsx \
  frontend/src/app/components/EventTicketCard.tsx \
  frontend/src/app/pages/Event.jsx \
  frontend/src/app/pages/Checkout.jsx
git commit -m "refactor: centralize getInitials() into lib/string-utils"
```
