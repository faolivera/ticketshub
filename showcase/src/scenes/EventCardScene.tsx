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
