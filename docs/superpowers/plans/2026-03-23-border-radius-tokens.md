# Border Radius Token Propagation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce 5 semantic border-radius tokens and propagate them across all frontend components, replacing every hardcoded value.

**Architecture:** Tokens defined in two sources of truth — `design-tokens.js` (JS numbers for inline styles) and `theme.css` (CSS tokens for Tailwind utilities). All inline `borderRadius:` values and Tailwind `rounded-*` classes are updated to use these tokens.

**Tech Stack:** React + Tailwind v4 (CSS-variable-based), inline styles, `class-variance-authority` (CVA) for shadcn/ui primitives.

---

## Token Reference

| Token | JS constant | Tailwind class | Value | Applies to |
|-------|-------------|----------------|-------|------------|
| hero   | `R_HERO`   | `rounded-hero`   | 20px  | Top-level section containers, modal shells, step cards |
| card   | `R_CARD`   | `rounded-card`   | 14px  | Event cards, info panels, search/filter bar containers, selectable option cards |
| button | `R_BUTTON` | `rounded-button` | 12px  | All CTAs (primary, secondary, ghost, destructive) |
| input  | `R_INPUT`  | `rounded-input`  | 12px  | Inputs, textareas, selects, upload drop zones, payment option rows, compact info boxes |
| pill   | `R_PILL`   | `rounded-pill`   | 9999px | Category pills, status badges, date chips, tags |

**Do NOT change:**
- `borderRadius: '50%'` — circular icons, avatars, status dots (geometric circles)
- `borderRadius: 2/3/5` — progress bars, skeleton shimmer text lines (decorative)
- `borderRadius: 6` on checkbox indicators (20×20 custom checkbox element in StepTerms) — intentionally subtle
- 44×44 icon containers already at `borderRadius: 12` — already correct, no semantic change needed
- Admin panel pages (`src/app/pages/admin/`) — out of scope
- shadcn/ui internals not listed below — out of scope

---

## Task 1: Add tokens to design-tokens.js

**Files:**
- Modify: `frontend/src/lib/design-tokens.js`

- [ ] **Step 1: Add radius exports at the bottom of design-tokens.js**

```js
// Border radius tokens
export const R_HERO   = 20;
export const R_CARD   = 14;
export const R_BUTTON = 12;
export const R_INPUT  = 12;
export const R_PILL   = 9999;
```

Add these after the `S` and `E` font exports at line 117.

---

## Task 2: Add Tailwind radius tokens to theme.css

**Files:**
- Modify: `frontend/src/styles/theme.css`

The project uses Tailwind v4. New tokens go inside the existing `@theme inline` block.

- [ ] **Step 1: Add to the `@theme inline` block in theme.css**

After the existing `--radius-xl` line, add:

```css
  --radius-hero:   20px;
  --radius-card:   14px;
  --radius-button: 12px;
  --radius-input:  12px;
  --radius-pill:   9999px;
```

This creates `rounded-hero`, `rounded-card`, `rounded-button`, `rounded-input`, and `rounded-pill` Tailwind utility classes.

---

## Task 3: Update UI primitive components

**Files:**
- Modify: `frontend/src/app/components/ui/button.tsx`
- Modify: `frontend/src/app/components/ui/input.tsx`
- Modify: `frontend/src/app/components/ui/badge.tsx`
- Modify: `frontend/src/app/components/ui/textarea.tsx`
- Modify: `frontend/src/app/components/ui/select.tsx`

- [ ] **Step 1: Update button.tsx**

In the CVA base class and all size variants, replace `rounded-md` with `rounded-button`:

```diff
- "inline-flex ... rounded-md ..."
+ "inline-flex ... rounded-button ..."

- sm: "h-8 rounded-md gap-1.5 px-3 ..."
+ sm: "h-8 rounded-button gap-1.5 px-3 ..."

- lg: "h-10 rounded-md px-6 ..."
+ lg: "h-10 rounded-button px-6 ..."

- icon: "size-9 rounded-md"
+ icon: "size-9 rounded-button"
```

- [ ] **Step 2: Update input.tsx**

```diff
- "... rounded-md border ..."
+ "... rounded-input border ..."
```

- [ ] **Step 3: Update badge.tsx**

```diff
- "inline-flex ... rounded-md border ..."
+ "inline-flex ... rounded-pill border ..."
```

- [ ] **Step 4: Update textarea.tsx**

Find the `rounded-md` class in the textarea className and replace with `rounded-input`.

- [ ] **Step 5: Update select.tsx — SelectTrigger only**

In the `SelectTrigger` component class string, replace `rounded-md` → `rounded-input`. Leave `SelectContent`'s `rounded-md` as-is (floating popover, shadcn internal).

---

## Task 4: Update transaction components (Tailwind classes)

**Files:**
- Modify: `frontend/src/app/components/transaction/EventCard.tsx`
- Modify: `frontend/src/app/components/transaction/TransactionSkeleton.tsx`
- Modify: `frontend/src/app/components/transaction/TransactionActionRequiredCard.tsx`
- Modify: `frontend/src/app/components/transaction/HelpCard.tsx`
- Modify: `frontend/src/app/components/transaction/PaymentInfoCard.tsx`
- Modify: `frontend/src/app/components/transaction/PaymentProofPreviewModal.tsx`
- Modify: `frontend/src/app/components/transaction/BuyerActionBlock.tsx`
- Modify: `frontend/src/app/components/transaction/CounterpartCard.tsx`
- Modify: `frontend/src/app/components/transaction/EscrowCard.tsx`
- Modify: `frontend/src/app/components/transaction/SellerActionBlock.tsx`
- Modify: `frontend/src/app/components/transaction/ModalOverlay.tsx`
- Modify: `frontend/src/app/components/transaction/BankDetailsBlock.tsx`
- Modify: `frontend/src/app/components/transaction/ActionHero.tsx`
- Modify: `frontend/src/app/components/transaction/TxMeta.tsx`
- Modify: `frontend/src/app/components/UserReviewsCard.tsx`

**Replacements:**

| Old class/value | New class/token | Context |
|-----------------|-----------------|---------|
| `rounded-[16px]` | `rounded-card` | Event card shell, skeleton card shell |
| `rounded-[14px]` | `rounded-card` | Info panel cards |
| `rounded-[10px]` | `rounded-button` | Action buttons |
| `rounded-[20px]` | `rounded-hero` | Modal overlay shell |
| `rounded-xl` (upload drop zone) | `rounded-input` | File upload area |
| `rounded-xl` (info sub-sections) | `rounded-card` | Info panels |
| `rounded-lg` (icon button) | `rounded-button` | Small icon-action button |
| `rounded-lg` (inline copy badge) | `rounded-pill` | Small inline badge |
| `rounded-lg` (info note paragraph) | `rounded-card` | Info/note block |
| `borderRadius: 14` (inline style) | `R_CARD` | Card container (inline style) |

- [ ] **Step 1: Apply replacements per file**

**EventCard.tsx:**
- Line 18: `rounded-[16px]` → `rounded-card`
- Lines 40, 47: `rounded-lg` (overlay label chips on event image) → `rounded-pill`

**TransactionSkeleton.tsx:**
- Line 19: `rounded-[16px]` → `rounded-card`
- Lines 39, 63, 80, 96, 115: `rounded-[14px]` → `rounded-card`
- Lines 72 and 126: `rounded-[10px]` → `rounded-button`
- Line 155: `rounded-lg` (skeleton bone for back-button area) → `rounded-button`

**TransactionActionRequiredCard.tsx:**
- Add `R_CARD` to import from design-tokens
- Line 102: `borderRadius: 14` (inline style) → `borderRadius: R_CARD`

**HelpCard.tsx:**
- Line 9: `rounded-[14px]` → `rounded-card`
- Line 20: `rounded-[10px]` → `rounded-button`

**PaymentInfoCard.tsx:**
- Lines 19 and 78: `rounded-[14px]` → `rounded-card`
- Line 65: `rounded-xl` (info note within card) → `rounded-card`

**PaymentProofPreviewModal.tsx:**
- Line 16: `rounded-xl` (scrollable image container) → `rounded-card`

**CounterpartCard.tsx:**
- Line 19: `rounded-[14px]` → `rounded-card`
- Line 36: `rounded-[10px]` → `rounded-button`

**EscrowCard.tsx:**
- Line 8: `rounded-[14px]` → `rounded-card`

**TxMeta.tsx:**
- Line 35: `rounded-[14px]` → `rounded-card`
- Line 60: `rounded-lg` (copy icon button) → `rounded-button`

**ActionHero.tsx:**
- Line 84: `rounded-[14px]` → `rounded-card`
- Line 94: `rounded-xl` (44×44 icon container) — leave as-is

**BuyerActionBlock.tsx:**
- Lines 148 and 315: `rounded-[10px]` → `rounded-button`
- Lines 125, 131, 200: `rounded-xl` (info sub-sections) → `rounded-card`
- Line 307: `rounded-lg` (info note paragraph) → `rounded-card`

**SellerActionBlock.tsx:**
- Lines 144 and 233: `rounded-[10px]` → `rounded-button`
- Line 210: `rounded-xl border-2 border-dashed` (upload drop zone) → `rounded-input`
- Lines 122, 178, 300: `rounded-xl` (info sub-sections) → `rounded-card`
- Line 272: `rounded-lg` (info note block) → `rounded-card`

**ModalOverlay.tsx:**
- Line 15: `rounded-[20px]` → `rounded-hero`
- Line 29: `rounded-lg` (close icon button) → `rounded-button`

**BankDetailsBlock.tsx:**
- Line 16: `rounded-xl` → `rounded-card`
- Line 28: `rounded-lg` (inline copy badge) → `rounded-pill`

**UserReviewsCard.tsx:**
- Line 231: `rounded-[10px]` → `rounded-button`

---

## Task 5: Update become-seller components (inline styles)

**Files:**
- Modify: `frontend/src/app/components/become-seller/StepBank.tsx`
- Modify: `frontend/src/app/components/become-seller/StepIdentity.tsx`
- Modify: `frontend/src/app/components/become-seller/StepPhone.tsx`
- Modify: `frontend/src/app/components/become-seller/StepTerms.tsx`

All four files already import from `@/lib/design-tokens`. Add `R_BUTTON, R_INPUT` to each import.

**Mapping rules for all four files:**

| Element | Old value | Token | Rationale |
|---------|-----------|-------|-----------|
| Text inputs, selects | `borderRadius: 11` | `R_INPUT` | Form inputs |
| Primary/secondary buttons | `borderRadius: 11` | `R_BUTTON` | CTA buttons |
| Error/info message boxes | `borderRadius: 11` | `R_INPUT` | Compact inline banners |
| Image preview / upload area | `borderRadius: 11` | `R_INPUT` | Interactive upload zones |
| Step card containers | `borderRadius: 20` | leave (`R_HERO`) | Already correct |
| 44×44 icon boxes | `borderRadius: 12` | leave | Already correct |

- [ ] **Step 1: Update StepBank.tsx**

Add `R_BUTTON, R_INPUT` to import. Then:
- Line 73: `borderRadius: 11` (input) → `borderRadius: R_INPUT`
- Line 95: `borderRadius: 11` (button) → `borderRadius: R_BUTTON`
- Line 258: `borderRadius: 11` (error banner) → `borderRadius: R_INPUT`

- [ ] **Step 2: Update StepIdentity.tsx**

Add `R_BUTTON, R_INPUT` to import. Then:
- Line 86: `borderRadius: 11` (input) → `borderRadius: R_INPUT`
- Line 109: `borderRadius: 11` (image preview) → `borderRadius: R_INPUT`
- Line 124: `borderRadius: 11` (upload area) → `borderRadius: R_INPUT`
- Line 160: `borderRadius: 11` (button) → `borderRadius: R_BUTTON`
- Line 388: `borderRadius: 11` (error box) → `borderRadius: R_INPUT`
- Line 400: `borderRadius: 11` (error box) → `borderRadius: R_INPUT`
- Line 505: `borderRadius: 11` (verify context — if input-like → `R_INPUT`, if button → `R_BUTTON`)

- [ ] **Step 3: Update StepPhone.tsx**

Add `R_BUTTON, R_INPUT` to import. Then:
- Line 63: `borderRadius: 11` (button) → `borderRadius: R_BUTTON`
- Line 197: `borderRadius: 11` (error banner) → `borderRadius: R_INPUT`
- Line 210: `borderRadius: 11` (container with overflow hidden) → `borderRadius: R_INPUT`
- Line 238: `borderRadius: 11` (info box) → `borderRadius: R_INPUT`

Note: Line 40 (`borderRadius: 12`) and Line 184 (`borderRadius: 12`) are already correct — leave as-is.

- [ ] **Step 4: Update StepTerms.tsx**

Add `R_BUTTON, R_INPUT` to import. Then:
- Line 46: `borderRadius: 11` (textarea/input) → `borderRadius: R_INPUT`
- Line 110: `borderRadius: 11` (primary CTA button) → `borderRadius: R_BUTTON`
- Line 214: `borderRadius: 11` (error box) → `borderRadius: R_INPUT`

Note: Lines 100, 126 (`borderRadius: 12`) are already correct — leave as-is. Line 189 (`borderRadius: 6`) is a custom checkbox indicator — leave as-is.

---

## Task 6: Update HighlightedEventsHero.tsx (inline styles)

**Files:**
- Modify: `frontend/src/app/components/home/HighlightedEventsHero.tsx`

File already imports from design-tokens. Add `R_BUTTON` to the import.

- [ ] **Step 1: Apply changes**

- Lines 138–139: `borderRadius: 10` (skeleton button placeholders) → `borderRadius: R_BUTTON`
- Line 269: `borderRadius: 10` (primary hero CTA) → `borderRadius: R_BUTTON`
- Line 303: `borderRadius: 10` (secondary hero CTA) → `borderRadius: R_BUTTON`

Leave:
- Line 124, 158: `borderRadius: 20` (hero containers) — correct
- Line 134: `borderRadius: 100` (skeleton pill) — correct
- Line 338: `borderRadius: 12` (metadata overlay chip on hero image) — already correct

---

## Task 7: Update LandingNew.tsx (inline styles)

**Files:**
- Modify: `frontend/src/app/pages/LandingNew.tsx`

File already imports from design-tokens. Add `R_BUTTON, R_INPUT, R_CARD` to the import.

- [ ] **Step 1: Apply inline style changes**

| Line | Old value | Token | Element |
|------|-----------|-------|---------|
| 362 | `borderRadius: 16` | `R_CARD` | Search/filter bar container |
| 376 | `borderRadius: 10` | `R_INPUT` | Search input |
| 384 | `borderRadius: 9`  | `R_BUTTON` | City picker button |
| 395 | `borderRadius: 7`  | `R_INPUT` | Inline search within city dropdown |
| 429 | `borderRadius: 10` | `R_INPUT` | Mobile filter search input |
| 439 | `borderRadius: 10` | `R_BUTTON` | Mobile filter button |
| 470 | `borderRadius: 10` | `R_BUTTON` | Mobile city selector button |
| 496 | `borderRadius: 8`  | `R_INPUT` | Inline search within mobile popup |
| 588 | `borderRadius: 10` | `R_BUTTON` | "Load more" button |
| 623 | `borderRadius: 16` | `R_CARD` | Featured events filter container |
| 627 | `borderRadius: 10` | `R_INPUT` | Skeleton: search input |
| 630 | `borderRadius: 9`  | `R_BUTTON` | Skeleton: city button |
| 641 | `borderRadius: 10` | `R_INPUT` | Skeleton: mobile search |
| 642 | `borderRadius: 10` | `R_BUTTON` | Skeleton: filter button |
| 661 | `borderRadius: 8`  | `R_BUTTON` | Skeleton: price/button element within card |
| 788 | `borderRadius: 8`  | `R_BUTTON` | `th-card-btn` (secondary button in event card) |

Leave:
- `borderRadius: 100` (pill badges and category chips) — correct
- `borderRadius: 14` (event cards at lines 651, 701) — correct
- `borderRadius: 5` (skeleton text shimmer lines) — decorative, leave
- `borderRadius: 12` (city dropdown container, mobile popup container) — already correct

---

## Task 8: Update MyTicket.tsx

**Files:**
- Modify: `frontend/src/app/pages/MyTicket.tsx`

File already imports from design-tokens. Add `R_BUTTON, R_INPUT, R_CARD` to the import.

- [ ] **Step 1: Apply inline style changes**

| Line | Old value | Token | Element |
|------|-----------|-------|---------|
| 628 | `borderRadius: 6` | `R_BUTTON` | Small icon-only action button |
| 830 | `borderRadius: 10` | `R_INPUT` | Review submitted success box |
| 1035 | `borderRadius: 11` | `R_INPUT` | Image preview (upload area) |
| 1038 | `borderRadius: 11` | `R_INPUT` | Image upload placeholder |
| 1315 | `borderRadius: 11` | `R_INPUT` | Image preview |
| 1318 | `borderRadius: 11` | `R_INPUT` | Image upload placeholder |

- [ ] **Step 2: Apply Tailwind class changes**

| Line(s) | Old class | New class | Element |
|---------|-----------|-----------|---------|
| 648 | `rounded-[16px]` | `rounded-card` | Ticket detail card |
| 659 | `rounded-xl` | `rounded-card` | Warning panel within card |
| 759 | `rounded-[10px]` | `rounded-button` | Refund/cancel button |
| 766 | `rounded-[16px]` | `rounded-card` | Section card |
| 778 | `rounded-[10px]` | `rounded-input` | Info display box |
| 802 | `rounded-[10px]` | `rounded-button` | Rating selection buttons |
| 814 | `rounded-[10px]` | `rounded-input` | Review textarea |
| 823 | `rounded-[10px]` | `rounded-button` | Submit review button |
| 956 | `rounded-lg` | `rounded-input` | Amber info note |
| 964 | `rounded-lg` | `rounded-input` | Payment option row |
| 983 | `rounded-lg` | `rounded-input` | Select/input field |
| 991 | `rounded-[10px]` | `rounded-button` | Secondary action button |
| 1018 | `rounded-[10px]` | `rounded-button` | Primary action button |
| 1059 | `rounded-xl` | `rounded-input` | Upload drop zone (border-dashed) |
| 1104 | `rounded-[10px]` | `rounded-button` | Secondary action button |
| 1129 | `rounded-[10px]` | `rounded-button` | Primary action button |
| 1152 | `rounded-[10px]` | `rounded-button` | CTA button |
| 1160 | `rounded-[10px]` | `rounded-button` | Destructive button |
| 1175 | `rounded-[10px]` | `rounded-button` | Link-style button |
| 1182 | `rounded-[10px]` | `rounded-button` | Secondary button |
| 1192 | `rounded-lg` | `rounded-input` | Amber info banner |
| 1238 | `rounded-lg` | `rounded-input` | Input/select (×2) |
| 1267 | `rounded-lg` | `rounded-button` | Cancel button |
| 1273 | `rounded-lg` | `rounded-button` | Destructive button |
| 1296 | `rounded-lg` | `rounded-input` | Amber info panel |
| 1300 | `rounded-lg` | `rounded-input` | Violet info panel |
| 1339 | `rounded-xl` | `rounded-input` | Upload drop zone |
| 1373 | `rounded-lg` | `rounded-button` | Cancel button |
| 1381 | `rounded-lg` | `rounded-button` | Confirm button |

---

## Task 9: Update remaining components

**Files:**
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepChooseEvent.tsx`
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx`
- Modify: `frontend/src/app/components/SellerUnverifiedModal.tsx`
- Modify: `frontend/src/app/components/Avatarcropmodal.tsx`
- Modify: `frontend/src/app/components/TermsModal.tsx`
- Modify: `frontend/src/app/components/SellerRiskRestrictionDisclaimer.tsx`
- Modify: `frontend/src/app/components/ErrorMessage.tsx`
- Modify: `frontend/src/app/components/EmptyState.tsx`
- Modify: `frontend/src/app/components/TicketChat.tsx`
- Modify: `frontend/src/app/pages/SellerProfile.tsx`
- Modify: `frontend/src/app/pages/CreateEvent.tsx`

- [ ] **Step 1: StepChooseEvent.tsx**

- Line 49: `rounded-xl` (event selection card) → `rounded-card`

- [ ] **Step 2: StepDeliveryMethod.tsx**

- Lines 41, 58, 92, 107: `rounded-xl border-2` (delivery option selection cards) → `rounded-card`

- [ ] **Step 3: SellerUnverifiedModal.tsx**

- Line 113: `rounded-2xl` (modal container) → `rounded-hero`

- [ ] **Step 4: Avatarcropmodal.tsx**

- Line 184: `rounded-xl` (modal container) → `rounded-hero`
- Line 205: `rounded-xl` (crop preview area) → `rounded-card`
- Line 249: `rounded-xl border-2 border-dashed` (upload drop zone) → `rounded-input`
- Line 280: `rounded-lg` (cancel/action button) → `rounded-button`

- [ ] **Step 5: TermsModal.tsx**

- Line 35: `rounded-lg` (modal container) → `rounded-hero`
- Line 66: `rounded-lg` (CTA button) → `rounded-button`

- [ ] **Step 6: SellerRiskRestrictionDisclaimer.tsx**

- Line 36: `rounded-lg` (warning banner container) → `rounded-card`
- Line 51: `rounded-lg` (button within banner) → `rounded-button`

- [ ] **Step 7: ErrorMessage.tsx**

- Line 58: `rounded-lg` (action button) → `rounded-button`
- Line 83: `rounded-lg` (error banner container) → `rounded-card`

- [ ] **Step 8: EmptyState.tsx**

- Lines 52, 59: `rounded-lg` (CTA buttons) → `rounded-button`

- [ ] **Step 9: TicketChat.tsx**

- Line 196: `rounded-2xl` (chat panel container on md+) → `rounded-hero`
- Line 304: `rounded-xl` (message bubble base class) → `rounded-card`
  - Note: `rounded-br-sm` and `rounded-bl-sm` on lines 308–309 are intentional tail modifications — leave as-is.

- [ ] **Step 10: SellerProfile.tsx**

Add `R_CARD` to import. Then:
- Line 153: `borderRadius: 16` (profile section card) → `borderRadius: R_CARD`

Lines 331, 455, 473: `borderRadius: 12` — already correct, leave.

**⚠️ Verify before changing:** Lines 544, 560, 578: `borderRadius: 6, fontSize: 11, color: MUTED` — small text label elements. If these are category/genre chips → change to `R_PILL`. If decorative text labels with intentional subtle rounding → leave. Check context visually before deciding.

- [ ] **Step 11: CreateEvent.tsx**

All `rounded-lg` in this file:
- Inputs (lines 399, 417, 433, 452, 470, 489, 506) → `rounded-input`
- Buttons (lines 512, 522, 598) → `rounded-button`
- Container panels (lines 120, 148, 371, 563) → `rounded-card`
- Remove button within upload (line 135) → `rounded-button`

---

## Task 10: Verify and commit

- [ ] **Step 1: Run the frontend dev server and visually spot-check**

```bash
cd frontend && npm run dev
```

Check: Landing page, event card page, checkout flow, become-seller wizard, MyTicket page.

- [ ] **Step 2: Verify no `rounded-[10px]`, `rounded-[14px]`, `rounded-[16px]`, `rounded-[20px]` remain outside admin**

```bash
grep -r "rounded-\[10px\]\|rounded-\[14px\]\|rounded-\[16px\]\|rounded-\[20px\]" frontend/src/app --include="*.tsx" | grep -v "pages/admin"
```

Expected: no output (or only intentional exceptions).

- [ ] **Step 3: Verify no hardcoded `borderRadius: 10` or `borderRadius: 11` remain in non-admin components**

```bash
grep -rn "borderRadius: 10\b\|borderRadius: 11\b\|borderRadius: 16\b\|borderRadius: 9\b\|borderRadius: 7\b\|borderRadius: 8\b" frontend/src/app --include="*.tsx" | grep -v "pages/admin"
```

Expected: no output (or only confirmed intentional exceptions).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/design-tokens.js \
        frontend/src/styles/theme.css \
        frontend/src/app/components/ui/button.tsx \
        frontend/src/app/components/ui/input.tsx \
        frontend/src/app/components/ui/badge.tsx \
        frontend/src/app/components/ui/textarea.tsx \
        frontend/src/app/components/ui/select.tsx \
        frontend/src/app/components/transaction/ \
        frontend/src/app/components/UserReviewsCard.tsx \
        frontend/src/app/components/become-seller/ \
        frontend/src/app/components/home/HighlightedEventsHero.tsx \
        frontend/src/app/components/sell-listing-wizard/steps/StepChooseEvent.tsx \
        frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx \
        frontend/src/app/components/SellerUnverifiedModal.tsx \
        frontend/src/app/components/Avatarcropmodal.tsx \
        frontend/src/app/components/TermsModal.tsx \
        frontend/src/app/components/SellerRiskRestrictionDisclaimer.tsx \
        frontend/src/app/components/ErrorMessage.tsx \
        frontend/src/app/components/EmptyState.tsx \
        frontend/src/app/components/TicketChat.tsx \
        frontend/src/app/pages/LandingNew.tsx \
        frontend/src/app/pages/MyTicket.tsx \
        frontend/src/app/pages/SellerProfile.tsx \
        frontend/src/app/pages/CreateEvent.tsx

git commit -m "design: propagate border-radius tokens across all frontend components"
```
