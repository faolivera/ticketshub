import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, S, R_BUTTON, R_INPUT, R_CARD } from '@/lib/design-tokens';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR     = 1920;
const MAX_YEAR     = CURRENT_YEAR - 10; // must be at least 10 years old

type Panel = 'day' | 'month' | 'year' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysInMonth(month: number | null, year: number | null): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

function isValidDate(day: number | null, month: number | null, year: number | null): boolean {
  if (!day || !month || !year) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function pad(n: number | null): string {
  if (n === null) return '--';
  return String(n).padStart(2, '0');
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DateOfBirthValue {
  day:   number;
  month: number;
  year:  number;
}

export interface DateOfBirthPickerProps {
  /** Current value. Pass null to render empty state. */
  value?: DateOfBirthValue | null;
  /** Called when all three parts are selected and form a valid date. */
  onChange?: (value: DateOfBirthValue) => void;
  /** Called on any partial change (useful for progressive validation). */
  onPartialChange?: (day: number | null, month: number | null, year: number | null) => void;
  /** Label shown above the field. */
  label?: string;
  /** Error message shown below the field. */
  error?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** Optional hint text below the field. */
  hint?: string;
}

// ─── Day panel ────────────────────────────────────────────────────────────────
function DayPanel({ selected, month, year, onSelect }: {
  selected: number | null;
  month: number | null;
  year: number | null;
  onSelect: (d: number) => void;
}) {
  const max = daysInMonth(month, year);
  const days = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div style={{ padding: '14px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center', ...S }}>
        Día
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map(d => {
          const isSelected = d === selected;
          return (
            <button key={d} type="button" onClick={() => onSelect(d)}
              style={{
                padding: '7px 0', borderRadius: R_BUTTON, border: 'none',
                background: isSelected ? V : 'transparent',
                color: isSelected ? 'white' : DARK,
                fontSize: 13, fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.12s', ...S,
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = VLIGHT; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month panel ─────────────────────────────────────────────────────────────
function MonthPanel({ selected, onSelect }: {
  selected: number | null;
  onSelect: (m: number) => void;
}) {
  return (
    <div style={{ padding: '14px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center', ...S }}>
        Mes
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MONTHS_ES.map((name, i) => {
          const m = i + 1;
          const isSelected = m === selected;
          return (
            <button key={m} type="button" onClick={() => onSelect(m)}
              style={{
                padding: '9px 14px', borderRadius: R_BUTTON, border: 'none',
                background: isSelected ? V : 'transparent',
                color: isSelected ? 'white' : DARK,
                fontSize: 13.5, fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', ...S,
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = VLIGHT; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Year panel ──────────────────────────────────────────────────────────────
function YearPanel({ selected, onSelect }: {
  selected: number | null;
  onSelect: (y: number) => void;
}) {
  // Build years descending so most recent (youngest valid) is first
  const years = Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 },
    (_, i) => MAX_YEAR - i,
  );

  // Scroll selected year into view
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, []);

  return (
    <div style={{ padding: '14px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center', ...S }}>
        Año
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {years.map(y => {
          const isSelected = y === selected;
          return (
            <button key={y} ref={isSelected ? selectedRef : undefined}
              type="button" onClick={() => onSelect(y)}
              style={{
                padding: '8px 0', borderRadius: R_BUTTON, border: 'none',
                background: isSelected ? V : 'transparent',
                color: isSelected ? 'white' : DARK,
                fontSize: 13, fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.12s', ...S,
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = VLIGHT; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function DateOfBirthPicker({
  value,
  onChange,
  onPartialChange,
  label = 'Fecha de nacimiento',
  error,
  disabled = false,
  hint,
}: DateOfBirthPickerProps) {

  const [day,   setDay]   = useState<number | null>(value?.day   ?? null);
  const [month, setMonth] = useState<number | null>(value?.month ?? null);
  const [year,  setYear]  = useState<number | null>(value?.year  ?? null);
  const [open,  setOpen]  = useState<Panel>(null);
  const [focused, setFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value) { setDay(value.day); setMonth(value.month); setYear(value.year); }
  }, [value?.day, value?.month, value?.year]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setFocused(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const notify = useCallback((d: number | null, m: number | null, y: number | null) => {
    onPartialChange?.(d, m, y);
    if (isValidDate(d, m, y)) onChange?.({ day: d!, month: m!, year: y! });
  }, [onChange, onPartialChange]);

  const handleSelectDay = (d: number) => {
    setDay(d);
    notify(d, month, year);
    // Auto-advance to next unfilled panel
    if (!month) setOpen('month');
    else if (!year) setOpen('year');
    else setOpen(null);
  };

  const handleSelectMonth = (m: number) => {
    setMonth(m);
    // Fix day if it's out of range for new month
    const maxD = daysInMonth(m, year);
    const correctedDay = day && day > maxD ? maxD : day;
    if (correctedDay !== day) setDay(correctedDay);
    notify(correctedDay, m, year);
    if (!year) setOpen('year');
    else if (!day) setOpen('day');
    else setOpen(null);
  };

  const handleSelectYear = (y: number) => {
    setYear(y);
    const maxD = daysInMonth(month, y);
    const correctedDay = day && day > maxD ? maxD : day;
    if (correctedDay !== day) setDay(correctedDay);
    notify(correctedDay, month, y);
    if (!month) setOpen('month');
    else if (!day) setOpen('day');
    else setOpen(null);
  };

  const togglePanel = (panel: Panel) => {
    if (disabled) return;
    setFocused(true);
    setOpen(prev => prev === panel ? null : panel);
  };

  const isEmpty  = !day && !month && !year;
  const isActive = (panel: Panel) => open === panel;
  const hasError = !!error;

  // Border color logic
  const borderColor = hasError ? '#fca5a5' : focused ? V : BORD2;
  const boxShadow   = hasError
    ? '0 0 0 3px rgba(220,38,38,0.1)'
    : focused ? '0 0 0 3px rgba(105,45,212,0.1)' : 'none';

  // Panel width for positioning
  const PANEL_WIDTHS: Record<NonNullable<Panel>, number> = {
    day: 248, month: 190, year: 248,
  };

  // Panel max heights (year needs more room)
  const PANEL_MAX_HEIGHTS: Record<NonNullable<Panel>, number> = {
    day: 260, month: 340, year: 320,
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', ...S }}>

      {/* Label */}
      {label && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, fontWeight: 700, color: MUTED,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 8, ...S,
        }}>
          {label}
        </label>
      )}

      {/* Main trigger — three segments */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        border: `1.5px solid ${borderColor}`,
        borderRadius: R_INPUT, background: disabled ? BG : CARD,
        boxShadow, transition: 'border-color 0.14s, box-shadow 0.14s',
        overflow: 'hidden', userSelect: 'none',
        opacity: disabled ? 0.6 : 1,
      }}>

        {/* Day segment */}
        <button type="button" onClick={() => togglePanel('day')} disabled={disabled}
          style={{
            flex: 1, padding: '12px 0', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: day ? DARK : HINT,
            fontSize: 16, fontWeight: day ? 700 : 400,
            transition: 'background 0.12s',
            background: isActive('day') ? VLIGHT : 'transparent', ...S,
          }}
        >
          {pad(day)}
        </button>

        {/* Separator */}
        <div style={{ width: 1, background: BORDER, margin: '8px 0', flexShrink: 0 }} />

        {/* Month segment */}
        <button type="button" onClick={() => togglePanel('month')} disabled={disabled}
          style={{
            flex: 2, padding: '12px 8px', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: month ? DARK : HINT,
            fontSize: 15, fontWeight: month ? 700 : 400,
            transition: 'background 0.12s',
            background: isActive('month') ? VLIGHT : 'transparent',
            textAlign: 'center', ...S,
          }}
        >
          {month ? MONTHS_ES[month - 1] : 'Mes'}
        </button>

        {/* Separator */}
        <div style={{ width: 1, background: BORDER, margin: '8px 0', flexShrink: 0 }} />

        {/* Year segment */}
        <button type="button" onClick={() => togglePanel('year')} disabled={disabled}
          style={{
            flex: '0 0 80px', padding: '12px 0', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: year ? DARK : HINT,
            fontSize: 15, fontWeight: year ? 700 : 400,
            transition: 'background 0.12s',
            background: isActive('year') ? VLIGHT : 'transparent', ...S,
          }}
        >
          {year ?? 'Año'}
        </button>

      </div>

      {/* Error / hint */}
      {(error || hint) && (
        <p style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.4, color: hasError ? '#dc2626' : HINT, ...S }}>
          {error ?? hint}
        </p>
      )}

      {/* Floating panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300,
          width: PANEL_WIDTHS[open],
          maxHeight: PANEL_MAX_HEIGHTS[open],
          overflowY: 'auto',
          background: CARD, borderRadius: R_CARD,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'popIn 0.14s cubic-bezier(0.32,0.72,0,1)',
        }}>
          {open === 'day'   && <DayPanel   selected={day}   month={month} year={year} onSelect={handleSelectDay}   />}
          {open === 'month' && <MonthPanel selected={month}                            onSelect={handleSelectMonth} />}
          {open === 'year'  && <YearPanel  selected={year}                             onSelect={handleSelectYear}  />}
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity:0; transform:translateY(-6px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        /* Custom scrollbar for year panel */
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 2px; }
        div::-webkit-scrollbar-thumb:hover { background: ${BORD2}; }
      `}</style>
    </div>
  );
}
