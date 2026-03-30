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
