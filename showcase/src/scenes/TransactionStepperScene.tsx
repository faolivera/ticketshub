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
