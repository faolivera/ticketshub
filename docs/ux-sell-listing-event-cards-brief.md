# UX Brief: Event Selection Cards — Sell Listing Page

**Product:** TicketsHub  
**Feature:** Sell listing wizard — step “Choose event”  
**Audience:** UX/UI designer  
**Date:** 2026-03-09

---

## 1. Context and problem

In the **sell-listing** flow, the user’s first step is to **choose the event** for which they want to list tickets. Events are shown as **cards** in a responsive grid (search + list). We need **design guidelines** to improve these cards so that:

- The card is **clear** and easy to scan.
- **Event data** is visible and readable (name, venue, and any other useful info).
- The look is **modern and professional**.
- Cards work well on **mobile and desktop** (layout, touch targets, hierarchy).

**Goal:** Provide **concrete design guidelines** (and optionally wireframes or high-level mockups) for the event selection cards on the sell-listing page, so development can implement a consistent, polished UI.

---

## 2. Current implementation (for reference)

- **Location:** Sell listing wizard → first step (“Select event”).
- **Layout:** Grid of cards; on mobile 1 column, on desktop 2–3 columns. Search input above the grid.
- **Card content today:**
  - **Image:** Event banner (rectangle variant, aspect 4:3 on mobile, video aspect on desktop). Fallback when no image.
  - **Overlay at bottom:** Event **name** (1 line) and **venue** (1 line), white text on dark gradient.
- **Data available per event (do not assume more fields exist unless we add them):**
  - `id`, `name`, `venue`, `category` (e.g. Concert, Sports, Theater, Festival, Conference, Comedy, Other), `squareBannerUrl`, `rectangleBannerUrl`.
- **Interaction:** Whole card is clickable (button); selects the event and advances to the next step. No “selected” state on the list (user moves to next step).

---

## 3. What we need from you

Please provide **design guidelines** (and optionally visuals) that cover:

1. **Card layout and hierarchy**
   - How to arrange image, event name, venue, and category (if shown).
   - Recommended aspect ratio(s) for the image area on mobile vs desktop.
   - Text truncation (e.g. 1 vs 2 lines for name/venue), font sizes, and contrast.

2. **Visual style**
   - Modern, professional look (e.g. corners, shadow, hover/focus).
   - How to handle missing banner image (placeholder, icon, background color).
   - Optional: use of category (e.g. small label/chip) and how it fits without clutter.

3. **Responsiveness**
   - Card width/height and grid (columns, gap) on mobile vs tablet vs desktop.
   - Minimum touch target size on mobile (e.g. 44px).
   - Any change in content or layout between breakpoints (e.g. hide category on small screens, or show more lines on desktop).

4. **Accessibility and interaction**
   - Focus state (keyboard) and any hover state.
   - Clear affordance that the card is selectable (e.g. cursor, subtle scale or shadow on hover).
   - If you recommend a “selected” state (e.g. for future use), how it should look.

5. **Optional**
   - Empty/loading state for the grid (we already have logic; we can align visuals to your guidelines).
   - Short recommendation on grid density: fewer large cards vs more smaller cards on desktop.

---

## 4. Data and constraints (for UI copy and layout)

- **Event fields we have:** name, venue, category (Concert, Sports, Theater, Festival, Conference, Comedy, Other), square and rectangle banner URLs (optional).
- **i18n:** All labels will be translated (e.g. Spanish + English). Prefer concise labels.
- **Tech stack:** React, Tailwind CSS, existing design tokens/theme (primary, muted, etc.). Implementation will follow your guidelines within this stack.

---

## 5. Deliverables we need

1. **Guidelines document** including:
   - Card structure (zones: image, title, subtitle, optional category).
   - Spacing, typography, and color (or reference to existing design system).
   - Behavior on mobile vs desktop (layout and optional content changes).
   - Hover/focus and optional selected state.
   - Fallback for missing image.

2. **Optional**
   - Wireframes or high-fidelity sketches for one card (mobile + desktop).
   - Optional: 2–3 variants (e.g. “minimal” vs “with category”) with a short recommendation.

---

## 6. Success criteria

- A user can **quickly see** which event is which (name + venue + optional category).
- Cards look **consistent, modern, and professional**.
- Layout is **responsive** and comfortable on **mobile and desktop**.
- **Touch targets** and **focus/hover** are clear and accessible.
- Guidelines are **specific enough** for a frontend developer to implement without guesswork.

---

## 7. After the design: implementation delegation

Once you have the designer’s guidelines (or mockups), we will:

1. **Hand off to the Frontend Dev agent** with:
   - This brief and the **designer’s notes/mockups** attached.
   - The exact file to change: `frontend/src/app/components/sell-listing-wizard/steps/StepChooseEvent.tsx` (and optionally shared styles or a small `EventCard` component).
   - Requirements: implement the new card layout and styles per the guidelines; keep existing behavior (search, pagination, selection, i18n); ensure responsive behavior and accessibility (focus, ARIA).

2. **Checklist for the implementation agent:**
   - [ ] Card layout and content match designer guidelines (image, name, venue, optional category).
   - [ ] Responsive grid and card sizing (mobile vs desktop).
   - [ ] Hover/focus and optional selected state.
   - [ ] Fallback when `squareBannerUrl`/`rectangleBannerUrl` are missing.
   - [ ] i18n for any new visible strings.
   - [ ] No regression in search, load more, or “create event” empty state.

**Instructions for the product owner:** Paste the designer’s response (guidelines + links to mockups if any) into a new chat and ask: “Implement the sell-listing event cards according to these designer guidelines” and attach this document and the designer’s deliverable. The orchestrator will delegate to the Frontend Dev agent and use the checklist above.
