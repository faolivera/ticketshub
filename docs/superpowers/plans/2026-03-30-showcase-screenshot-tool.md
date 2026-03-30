# Showcase & Screenshot Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated Vite app (`showcase/`) for rendering TicketsHub components with editable mock data, plus a Playwright-based HTTP server that captures those components as transparent PNGs.

**Architecture:** A standalone Vite app at `showcase/` imports components from `../frontend/src/` via a `@/` path alias and renders them in a two-panel UI (controls left, preview right). A Node.js HTTP server (`scripts/screenshot-server.ts`) listens on port 3333 and uses Playwright to navigate to the showcase URL and capture `[data-capture-target]` as PNG with `omitBackground: true`. State is encoded in the URL hash so Playwright gets exactly the same view the user configured.

**Tech Stack:** Vite 6, React 18, TypeScript, Tailwind v4, react-i18next, react-router-dom v7, Playwright, tsx

---

## File Map

**Create:**
- `showcase/package.json` — showcase app dependencies
- `showcase/tsconfig.json` — TypeScript config with `@/` → `../frontend/src/`
- `showcase/index.html` — HTML entry with Google Fonts
- `showcase/vite.config.ts` — Vite config with path alias and Tailwind plugin
- `showcase/src/showcase.css` — Tailwind v4 + frontend theme import
- `showcase/src/main.tsx` — React root with MemoryRouter + i18n init
- `showcase/src/App.tsx` — two-panel layout, scene/viewport selectors, capture button
- `showcase/src/scenes/EventCardScene.tsx` — EventCard controls + preview
- `showcase/src/scenes/TransactionStepperScene.tsx` — TransactionStepper controls + preview
- `scripts/screenshot-server.ts` — Playwright HTTP server on port 3333

**Modify:**
- `package.json` (root) — add `tsx` devDep + `screenshot-server` and `showcase` scripts
- `.gitignore` — add `screenshots/`

---

## Task 1: Scaffold `showcase/` package

**Files:**
- Create: `showcase/package.json`
- Create: `showcase/tsconfig.json`
- Create: `showcase/index.html`

- [ ] **Step 1: Create `showcase/package.json`**

```json
{
  "name": "ticketshub-showcase",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.12.0",
    "react-i18next": "^16.5.3",
    "i18next": "^25.8.0",
    "lucide-react": "0.487.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "4.7.0",
    "@tailwindcss/vite": "4.1.12",
    "tailwindcss": "4.1.12",
    "vite": "6.3.5",
    "typescript": "^5.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "playwright": "^1.49.1"
  }
}
```

- [ ] **Step 2: Create `showcase/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["../frontend/src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `showcase/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TicketsHub Showcase</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Install showcase dependencies**

```bash
cd showcase && pnpm install
```

Expected: `node_modules/` created, `pnpm-lock.yaml` generated, Playwright downloaded.

- [ ] **Step 5: Commit**

```bash
git add showcase/package.json showcase/tsconfig.json showcase/index.html showcase/pnpm-lock.yaml
git commit -m "feat: scaffold showcase app package"
```

---

## Task 2: Vite config + app shell

**Files:**
- Create: `showcase/vite.config.ts`
- Create: `showcase/src/showcase.css`
- Create: `showcase/src/main.tsx`

- [ ] **Step 1: Create `showcase/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../frontend/src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
})
```

- [ ] **Step 2: Create `showcase/src/showcase.css`**

This imports Tailwind v4 and the frontend's CSS custom properties (design tokens, border-radius variables like `--radius-card`, `--radius-button`, color variables). The `@theme inline` block inside `theme.css` is a Tailwind v4 directive and is processed correctly when imported after `@import "tailwindcss"`.

```css
@import "tailwindcss";
@import "../../frontend/src/styles/theme.css";
```

- [ ] **Step 3: Create `showcase/src/main.tsx`**

Imports i18n config from the frontend (via `@/` alias). This initializes i18next with `es` locale using the frontend's existing locale files. Wraps the app in `MemoryRouter` so `Link` components in frontend components don't cause navigation errors.

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n/config'
import './showcase.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </React.StrictMode>
)
```

- [ ] **Step 4: Create a minimal `showcase/src/App.tsx` placeholder to confirm dev server starts**

```tsx
export default function App() {
  return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Showcase — OK</div>
}
```

- [ ] **Step 5: Start dev server and verify it loads**

```bash
cd showcase && pnpm dev
```

Expected: browser at `http://localhost:5174` shows "Showcase — OK". No TypeScript or import errors in the terminal.

- [ ] **Step 6: Commit**

```bash
git add showcase/vite.config.ts showcase/src/showcase.css showcase/src/main.tsx showcase/src/App.tsx
git commit -m "feat: add showcase vite config and app shell"
```

---

## Task 3: EventCard scene

**Files:**
- Create: `showcase/src/scenes/EventCardScene.tsx`

The `EventCard` landing component (`@/app/pages/landing/components/EventCard`) uses inline styles and `react-i18next`. It renders a mobile card or desktop card depending on `window.innerWidth`. In the showcase browser, it'll show the desktop layout (since `window.innerWidth` is large). Playwright screenshots will correctly show the mobile layout because Playwright sets viewport to 375px. State is exposed via `EventCardState` so App can encode it in the URL hash.

- [ ] **Step 1: Create `showcase/src/scenes/EventCardScene.tsx`**

```tsx
import { useState } from 'react'
import type { FC, CSSProperties } from 'react'
import { EventCard } from '@/app/pages/landing/components/EventCard'

export interface EventCardState {
  name: string
  venue: string
  city: string
  dates: string
  img: string
  price: string | null
  priceCurrency: string
  available: number | null
  badge: 'últimas' | 'demanda' | null
}

export const DEFAULT_EVENT_CARD_STATE: EventCardState = {
  name: 'Coldplay: Music of the Spheres World Tour',
  venue: 'Estadio Monumental',
  city: 'Buenos Aires',
  dates: '28 Mar · 21:00hs, 29 Mar · 21:00hs',
  img: 'https://images.unsplash.com/photo-1540039155733-5bb30b4e5a23?w=400&h=300&fit=crop',
  price: '85.000',
  priceCurrency: 'ARS',
  available: 3,
  badge: 'últimas',
}

function toCardShape(s: EventCardState) {
  return {
    id: 'preview',
    slug: '',
    name: s.name,
    venue: s.venue,
    city: s.city,
    dates: s.dates.split(',').map(d => d.trim()).filter(Boolean),
    img: s.img,
    price: s.price,
    priceCurrency: s.priceCurrency,
    available: s.available,
    badge: s.badge,
    category: undefined as string | undefined,
  }
}

interface ControlsProps {
  state: EventCardState
  onChange: (s: EventCardState) => void
}

export const EventCardControls: FC<ControlsProps> = ({ state, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {([
      ['Nombre del evento', 'name'],
      ['Venue', 'venue'],
      ['Ciudad', 'city'],
      ['Fechas (separadas por coma)', 'dates'],
      ['URL imagen', 'img'],
      ['Precio (sin decimales, ej: 85.000)', 'price'],
      ['Moneda', 'priceCurrency'],
    ] as [string, keyof EventCardState][]).map(([label, key]) => (
      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={LABEL_S}>{label}</span>
        <input
          value={String(state[key] ?? '')}
          onChange={e => onChange({ ...state, [key]: e.target.value === '' && key === 'price' ? null : e.target.value })}
          style={INPUT_S}
        />
      </div>
    ))}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={LABEL_S}>Entradas disponibles</span>
      <input
        type="number"
        value={state.available ?? ''}
        onChange={e => onChange({ ...state, available: e.target.value === '' ? null : Number(e.target.value) })}
        style={INPUT_S}
      />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={LABEL_S}>Badge</span>
      <select
        value={state.badge ?? ''}
        onChange={e => onChange({ ...state, badge: (e.target.value || null) as EventCardState['badge'] })}
        style={INPUT_S}
      >
        <option value="">Sin badge</option>
        <option value="últimas">Últimas entradas</option>
        <option value="demanda">Alta demanda</option>
      </select>
    </div>
  </div>
)

export const EventCardPreview: FC<{ state: EventCardState }> = ({ state }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div data-capture-target style={{ padding: 12 }}>
      <EventCard
        event={toCardShape(state)}
        index={0}
        hovered={hovered}
        onHover={id => setHovered(id !== null)}
      />
    </div>
  )
}

const LABEL_S: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#6b7280',
  letterSpacing: '0.04em',
}

const INPUT_S: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#f3f3f0',
  fontSize: 13,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  width: '100%',
  boxSizing: 'border-box',
}
```

- [ ] **Step 2: Commit**

```bash
git add showcase/src/scenes/EventCardScene.tsx
git commit -m "feat: add EventCard showcase scene"
```

---

## Task 4: TransactionStepper scene

**Files:**
- Create: `showcase/src/scenes/TransactionStepperScene.tsx`

`TransactionStepper` uses Tailwind classes. These will be picked up automatically by the Tailwind v4 Vite plugin since the component is part of the module graph. The `--radius-*` CSS variables from `theme.css` are available because `showcase.css` imports `theme.css`.

- [ ] **Step 1: Create `showcase/src/scenes/TransactionStepperScene.tsx`**

```tsx
import type { FC, CSSProperties } from 'react'
import { TransactionStepper } from '@/app/components/transaction/TransactionStepper'
import type { TransactionStatus } from '@/api/types'

export interface TransactionStepperState {
  effectiveStatus: TransactionStatus
  role: 'buyer' | 'seller'
  disputed: boolean
}

export const DEFAULT_TRANSACTION_STEPPER_STATE: TransactionStepperState = {
  effectiveStatus: 'PaymentReceived',
  role: 'buyer',
  disputed: false,
}

const BUYER_LABELS = ['Pago', 'Transferencia', 'Fondos protegidos', 'Completado']
const SELLER_LABELS = ['Pago recibido', 'Transferir entrada', 'Fondos en escrow', 'Liberando fondos', 'Completado']

const ALL_STATUSES: TransactionStatus[] = [
  'PendingPayment',
  'PaymentPendingVerification',
  'PaymentReceived',
  'TicketTransferred',
  'DepositHold',
  'TransferringFund',
  'Completed',
  'Cancelled',
  'Refunded',
  'Disputed',
]

interface ControlsProps {
  state: TransactionStepperState
  onChange: (s: TransactionStepperState) => void
}

export const TransactionStepperControls: FC<ControlsProps> = ({ state, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={LABEL_S}>Estado</span>
      <select
        value={state.effectiveStatus}
        onChange={e => onChange({ ...state, effectiveStatus: e.target.value as TransactionStatus })}
        style={INPUT_S}
      >
        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={LABEL_S}>Rol</span>
      <select
        value={state.role}
        onChange={e => onChange({ ...state, role: e.target.value as 'buyer' | 'seller' })}
        style={INPUT_S}
      >
        <option value="buyer">Comprador</option>
        <option value="seller">Vendedor</option>
      </select>
    </div>

    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f0f1a', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={state.disputed}
        onChange={e => onChange({ ...state, disputed: e.target.checked })}
      />
      En disputa (oculta el stepper)
    </label>
  </div>
)

export const TransactionStepperPreview: FC<{ state: TransactionStepperState }> = ({ state }) => (
  <div data-capture-target style={{ padding: 20, background: '#ffffff' }}>
    <TransactionStepper
      effectiveStatus={state.effectiveStatus}
      disputed={state.disputed}
      role={state.role}
      labels={state.role === 'buyer' ? BUYER_LABELS : SELLER_LABELS}
    />
  </div>
)

const LABEL_S: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#6b7280',
  letterSpacing: '0.04em',
}

const INPUT_S: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#f3f3f0',
  fontSize: 13,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  width: '100%',
  boxSizing: 'border-box',
}
```

- [ ] **Step 2: Commit**

```bash
git add showcase/src/scenes/TransactionStepperScene.tsx
git commit -m "feat: add TransactionStepper showcase scene"
```

---

## Task 5: Full App.tsx

**Files:**
- Modify: `showcase/src/App.tsx` (replace placeholder)

State for all scenes is held in App. On every state change, the full state is encoded as base64 JSON in the URL hash (`window.location.hash`). When Playwright opens that URL, App reads the hash on mount and restores the exact state the user configured.

- [ ] **Step 1: Replace `showcase/src/App.tsx` with the full two-panel layout**

```tsx
import { useState, useEffect, useCallback } from 'react'
import type { FC, CSSProperties } from 'react'
import {
  EventCardControls,
  EventCardPreview,
  DEFAULT_EVENT_CARD_STATE,
} from './scenes/EventCardScene'
import type { EventCardState } from './scenes/EventCardScene'
import {
  TransactionStepperControls,
  TransactionStepperPreview,
  DEFAULT_TRANSACTION_STEPPER_STATE,
} from './scenes/TransactionStepperScene'
import type { TransactionStepperState } from './scenes/TransactionStepperScene'

type SceneId = 'EventCard' | 'TransactionStepper'

const VIEWPORT_OPTIONS = [
  { label: 'iPhone SE (375px)', width: 375, height: 667 },
  { label: 'iPhone 14 (390px)', width: 390, height: 844 },
  { label: 'iPhone 14 Plus (414px)', width: 414, height: 896 },
]

interface SavedState {
  scene: SceneId
  vpWidth: number
  eventCard: EventCardState
  transactionStepper: TransactionStepperState
}

function readHash(): Partial<SavedState> {
  try {
    const h = window.location.hash.slice(1)
    return h ? (JSON.parse(atob(h)) as SavedState) : {}
  } catch {
    return {}
  }
}

const App: FC = () => {
  const saved = readHash()

  const [scene, setScene] = useState<SceneId>(saved.scene ?? 'EventCard')
  const [vpWidth, setVpWidth] = useState<number>(saved.vpWidth ?? 390)
  const [eventCard, setEventCard] = useState<EventCardState>(saved.eventCard ?? DEFAULT_EVENT_CARD_STATE)
  const [txStepper, setTxStepper] = useState<TransactionStepperState>(saved.transactionStepper ?? DEFAULT_TRANSACTION_STEPPER_STATE)
  const [capturing, setCapturing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const viewport = VIEWPORT_OPTIONS.find(v => v.width === vpWidth) ?? VIEWPORT_OPTIONS[1]

  useEffect(() => {
    const state: SavedState = { scene, vpWidth, eventCard, transactionStepper: txStepper }
    history.replaceState(null, '', `#${btoa(JSON.stringify(state))}`)
  }, [scene, vpWidth, eventCard, txStepper])

  const capture = useCallback(async () => {
    setCapturing(true)
    setFeedback(null)
    try {
      const res = await fetch('http://localhost:3333/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          selector: '[data-capture-target]',
          viewport: { width: viewport.width, height: viewport.height },
          sceneName: scene,
        }),
      })
      const data = await res.json() as { success: boolean; path?: string; error?: string }
      setFeedback(data.success ? `✓ Guardado: ${data.path}` : `✗ Error: ${data.error}`)
    } catch {
      setFeedback('✗ No se pudo conectar con el servidor en localhost:3333 — ¿está corriendo?')
    } finally {
      setCapturing(false)
    }
  }, [scene, viewport])

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f3f3f0' }}>
      {/* ── Controls panel ── */}
      <div style={PANEL_S}>
        <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0f0f1a', letterSpacing: '-0.3px' }}>
          Showcase
        </h1>

        <Field label="Scene">
          <select value={scene} onChange={e => setScene(e.target.value as SceneId)} style={SELECT_S}>
            <option value="EventCard">EventCard (landing)</option>
            <option value="TransactionStepper">TransactionStepper</option>
          </select>
        </Field>

        <Field label="Viewport">
          <select
            value={vpWidth}
            onChange={e => setVpWidth(Number(e.target.value))}
            style={SELECT_S}
          >
            {VIEWPORT_OPTIONS.map(v => <option key={v.width} value={v.width}>{v.label}</option>)}
          </select>
        </Field>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />

        {scene === 'EventCard' && (
          <EventCardControls state={eventCard} onChange={setEventCard} />
        )}
        {scene === 'TransactionStepper' && (
          <TransactionStepperControls state={txStepper} onChange={setTxStepper} />
        )}
      </div>

      {/* ── Preview panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, overflow: 'auto' }}>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
          Preview (ancho {viewport.width}px) — el screenshot usa el viewport real de Playwright
        </p>

        <div style={{ width: viewport.width, outline: '1px dashed #d1d5db', background: 'transparent' }}>
          {scene === 'EventCard' && <EventCardPreview state={eventCard} />}
          {scene === 'TransactionStepper' && <TransactionStepperPreview state={txStepper} />}
        </div>

        <button onClick={capture} disabled={capturing} style={BTN_S(capturing)}>
          {capturing ? 'Capturando...' : '📸 Capturar PNG'}
        </button>

        {feedback && (
          <p style={{ fontSize: 12, color: feedback.startsWith('✓') ? '#16a34a' : '#be185d', margin: 0, maxWidth: 420, textAlign: 'center' }}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  )
}

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.04em' }}>
      {label}
    </span>
    {children}
  </div>
)

const PANEL_S: CSSProperties = {
  width: 280,
  minWidth: 280,
  padding: 24,
  borderRight: '1px solid #e5e7eb',
  overflowY: 'auto',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

const SELECT_S: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#f3f3f0',
  fontSize: 13,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  width: '100%',
}

const BTN_S = (disabled: boolean): CSSProperties => ({
  padding: '10px 28px',
  borderRadius: 10,
  background: '#6d28d9',
  color: 'white',
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  boxShadow: disabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
})

export default App
```

- [ ] **Step 2: Open `http://localhost:5174` and verify**

Confirm: scene selector shows "EventCard (landing)" and "TransactionStepper". Changing any control field updates the preview in real time. The URL hash updates on each change (visible in the address bar).

- [ ] **Step 3: Commit**

```bash
git add showcase/src/App.tsx
git commit -m "feat: add showcase two-panel layout with URL-hash state"
```

---

## Task 6: Screenshot server + root scripts

**Files:**
- Create: `scripts/screenshot-server.ts`
- Modify: `package.json` (root)
- Modify: `.gitignore`

- [ ] **Step 1: Add `tsx` devDep and scripts to root `package.json`**

In the root `package.json`, add to `devDependencies`:
```json
"tsx": "^4.19.2"
```

Add to `scripts`:
```json
"screenshot-server": "tsx scripts/screenshot-server.ts",
"showcase": "concurrently \"cd showcase && pnpm dev\" \"pnpm screenshot-server\""
```

Full updated `scripts` block (merge with existing):
```json
"scripts": {
  "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
  "install:backend": "cd backend && npm install",
  "install:frontend": "cd frontend && npm install",
  "docker:up": "docker-compose up -d",
  "docker:down": "docker-compose down",
  "grafana": "docker-compose -f observability/local/docker-compose.yml up -d",
  "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
  "dev:backend": "cd backend && NODE_ENV=development npm run start:dev",
  "dev:frontend": "cd frontend && npm run dev",
  "build": "npm run build:backend && npm run build:frontend",
  "build:backend": "cd backend && npm run build",
  "build:frontend": "cd frontend && npm run build",
  "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\"",
  "test:e2e": "cd backend && npm run test:e2e",
  "start:backend": "cd backend && npm run start:prod",
  "start:frontend": "cd frontend && npm run preview",
  "prisma": "cd backend && npx prisma studio",
  "render:build": "./release/render/render-build.sh",
  "render:publish": "./release/render/render-publish.sh",
  "landing:build": "./release/landing/build.sh",
  "landing:publish": "./release/landing/landing-publish.sh",
  "screenshot-server": "tsx scripts/screenshot-server.ts",
  "showcase": "concurrently \"cd showcase && pnpm dev\" \"pnpm screenshot-server\""
}
```

- [ ] **Step 2: Install tsx at root**

```bash
pnpm install
```

Expected: `tsx` added to root `node_modules`.

- [ ] **Step 3: Create `scripts/screenshot-server.ts`**

```typescript
import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const PORT = 3333
const SCREENSHOTS_DIR = join(process.cwd(), 'screenshots')

interface ScreenshotRequest {
  url: string
  selector: string
  viewport: { width: number; height: number }
  sceneName: string
}

function timestamp(): string {
  return new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
}

async function handleScreenshot(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body = ''
  for await (const chunk of req) body += String(chunk)

  const payload = JSON.parse(body) as ScreenshotRequest
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()
    await page.setViewportSize(payload.viewport)
    await page.goto(payload.url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    const element = page.locator(payload.selector)
    await element.waitFor({ state: 'visible' })

    if (!existsSync(SCREENSHOTS_DIR)) {
      await mkdir(SCREENSHOTS_DIR, { recursive: true })
    }

    const filename = `${timestamp()}_${payload.sceneName}.png`
    const filepath = join(SCREENSHOTS_DIR, filename)
    await element.screenshot({ path: filepath, omitBackground: true })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, path: `screenshots/${filename}` }))
  } finally {
    await browser.close()
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/screenshot') {
    res.writeHead(404)
    res.end(JSON.stringify({ success: false, error: 'Not found' }))
    return
  }

  try {
    await handleScreenshot(req, res)
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(err) }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`Screenshot server listening on http://localhost:${PORT}`)
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}`)
})
```

- [ ] **Step 4: Add `screenshots/` to `.gitignore`**

Append to the end of `.gitignore`:
```
# Screenshot output (showcase tool)
screenshots/
```

- [ ] **Step 5: Verify screenshot server starts**

```bash
pnpm screenshot-server
```

Expected output:
```
Screenshot server listening on http://localhost:3333
Screenshots will be saved to: /Users/kfx/proyects/ticketshub/screenshots
```

Kill with Ctrl+C.

- [ ] **Step 6: End-to-end test**

In two terminals:
```bash
# Terminal 1
pnpm showcase

# Terminal 2 — or just use the Capture button in the browser
```

Open `http://localhost:5174`, select "EventCard", set some fields, click "📸 Capturar PNG".

Expected:
- Feedback shows `✓ Guardado: screenshots/2026-03-30_XX-XX-XX_EventCard.png`
- File exists at that path
- File is a valid PNG with transparent background (open in Finder with transparent checkerboard visible where background would be)

- [ ] **Step 7: Commit**

```bash
git add scripts/screenshot-server.ts package.json .gitignore
git commit -m "feat: add screenshot server and root showcase scripts"
```

---

## Playwright Chromium browser install note

After running `cd showcase && pnpm install`, Playwright may need its browser binaries downloaded separately:

```bash
cd showcase && npx playwright install chromium
```

If the screenshot server errors with "Executable doesn't exist", run the above command.

---

## Adding new scenes (reference)

To add a new scene (e.g., for `transaction/EventCard`):

1. Create `showcase/src/scenes/TxEventCardScene.tsx` following the same pattern as `EventCardScene.tsx`: export `TxEventCardState`, `DEFAULT_TX_EVENT_CARD_STATE`, `TxEventCardControls`, `TxEventCardPreview`.
2. In `App.tsx`:
   - Add `'TxEventCard'` to the `SceneId` type
   - Import the four exports
   - Add `txEventCard: TxEventCardState` to `SavedState` and the `useState` block
   - Add an `<option>` to the scene selector
   - Add a conditional block in the controls and preview sections
