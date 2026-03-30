# Showcase & Screenshot Tool — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

A standalone tool for capturing production-quality PNG screenshots with transparent backgrounds of TicketsHub components, primarily for Instagram content. Consists of two parts: an isolated Vite app (`showcase/`) that renders components interactively, and a Node.js server (`scripts/screenshot-server.ts`) that uses Playwright to capture transparent PNGs.

**Key constraint:** Zero changes to the production frontend (`frontend/`).

---

## Structure

```
ticketshub/
  showcase/
    src/
      main.tsx
      App.tsx
      scenes/
        EventCard.tsx
        LandingHero.tsx
        TransactionFlow.tsx
        (one file per component/screen to capture)
    index.html
    vite.config.ts        # resolves @/ → ../frontend/src/
    tsconfig.json
    package.json          # devDeps: vite, react, react-dom, typescript, playwright, tsx

  scripts/
    screenshot-server.ts  # HTTP server on :3333

  screenshots/            # output PNGs — gitignored
```

---

## Showcase App (`showcase/`)

- Runs on **port 5174** via `pnpm dev` inside `showcase/`.
- Imports components directly from `../frontend/src/` via `@/` path alias in its own `vite.config.ts`. No changes to `frontend/vite.config.ts`.
- Has its own `tsconfig.json` that mirrors the frontend's compiler options so shared components compile correctly.

### UI Layout

Two-panel layout:

- **Left panel — Controls**: scene selector (dropdown), editable fields per scene (event name, date, price, username, review count, etc.), viewport selector (375px / 390px / 414px).
- **Right panel — Preview**: renders the selected component with the current control values. Background is `transparent`. The root element has `data-capture-target="true"` for Playwright to locate it. A "Capturar PNG" button at the bottom calls the screenshot server.

### Scenes

Each scene is a file in `showcase/src/scenes/` that:
1. Defines its own controls (using a `controls` config object — label, type, default value).
2. Renders the real component with control values as props.
3. Exports a `sceneId` string used as the filename prefix for saved screenshots.

Initial scenes to implement:
- `EventCard` — event name, date, venue, price, image URL
- `LandingHero` — headline, subheadline, CTA text
- `TransactionFlow` — buyer/seller name, amount, status (enum: pending / confirmed / cancelled), step index

### Viewport simulation

The preview container's width is set to the selected viewport width (375 / 390 / 414px). Height is auto. This simulates mobile without using DevTools device emulation.

### Capture button

On click, the button sends:

```ts
POST http://localhost:3333/screenshot
{
  url: window.location.href,         // e.g. http://localhost:5174/?scene=EventCard
  selector: '[data-capture-target]',
  viewport: { width: 375, height: 812 },
  sceneName: 'EventCard'
}
```

On success, shows a toast with the saved file path.

---

## Screenshot Server (`scripts/screenshot-server.ts`)

- Plain Node.js HTTP server (no Express dependency) on **port 3333**.
- Uses `playwright` (Chromium) installed as a devDependency in `showcase/package.json`.
- Run with `tsx scripts/screenshot-server.ts` from the monorepo root.

### Endpoint

`POST /screenshot`

Request body:
```ts
{
  url: string;
  selector: string;
  viewport: { width: number; height: number };
  sceneName: string;
}
```

Flow:
1. Launch Chromium headless.
2. Set viewport to `{ width, height }`.
3. Navigate to `url`, wait for `networkidle`.
4. Wait for `selector` to be visible.
5. Capture the element: `element.screenshot({ omitBackground: true, type: 'png' })`.
6. Save to `screenshots/YYYY-MM-DD_HH-mm-ss_<sceneName>.png`.
7. Close browser.
8. Respond `200 { success: true, path: '<relative-path>' }`.

On error: respond `500 { success: false, error: '<message>' }`.

CORS header `Access-Control-Allow-Origin: *` is set so the showcase app (port 5174) can call it freely.

---

## Running the Tool

```bash
# Terminal 1
cd showcase && pnpm dev       # → http://localhost:5174

# Terminal 2
pnpm screenshot-server        # → http://localhost:3333
```

Root `package.json` scripts to add:
```json
"screenshot-server": "tsx scripts/screenshot-server.ts",
"showcase": "concurrently \"cd showcase && pnpm dev\" \"pnpm screenshot-server\""
```

`concurrently` added as a root devDependency.

---

## Output

- PNGs saved to `screenshots/` at the monorepo root.
- `screenshots/` is added to `.gitignore`.
- Filename format: `2026-03-30_14-32-05_EventCard.png`

---

## Dependencies

| Package | Where | Type |
|---------|-------|------|
| `playwright` | `showcase/package.json` | devDependency |
| `@playwright/test` | `showcase/package.json` | devDependency (for types) |
| `tsx` | root `package.json` | devDependency |
| `concurrently` | root `package.json` | devDependency |

Puppeteer is **not required** — Playwright covers everything needed. Installing both would be redundant.

---

## What is NOT included

- No Storybook.
- No changes to `frontend/` (no routes, no components, no config).
- No production build for the showcase app.
- No automated screenshot batching — workflow is entirely manual/interactive.
