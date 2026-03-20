import { CreditCard, Shield } from 'lucide-react';
import {
  V,
  CARD,
  BORDER,
  DARK,
  MUTED,
  HINT,
  BLIGHT,
  BLUE,
  DESTRUCTIVE,
  S,
} from '@/lib/design-tokens';
import type { PaymentInfoBuyerProps, PaymentInfoSellerProps } from './types';

export function PaymentInfoBuyerCard(p: PaymentInfoBuyerProps) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5" style={{ color: V }} />
        <h2 className="text-base" style={{ ...S, fontWeight: 700, color: DARK }}>
          {p.title ?? 'Payment'}
        </h2>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span style={{ color: MUTED }}>{p.subtotalLabel}</span>
          <span className="font-medium" style={{ color: DARK }}>
            {p.subtotalAmount}
          </span>
        </div>
        <p className="text-xs" style={{ color: HINT }}>
          {p.subtotalDetail}
        </p>
        <div className="flex justify-between gap-2">
          <span style={{ color: MUTED }}>{p.feeLabel}</span>
          <span className="font-medium" style={{ color: DARK }}>
            {p.feeAmount}
          </span>
        </div>
        <p className="text-xs" style={{ color: HINT }}>
          {p.feeDetail}
        </p>
        <div
          className="mt-3 flex justify-between border-t pt-3"
          style={{ borderColor: BORDER }}
        >
          <span className="font-bold" style={{ color: DARK }}>
            {p.totalLabel}
          </span>
          <span className="text-xl font-extrabold" style={{ color: V }}>
            {p.totalFormatted}
          </span>
        </div>
      </div>
      {p.methodName && (
        <p className="mt-4 text-xs" style={{ color: MUTED }}>
          <span className="font-semibold">{p.methodLabel}</span> {p.methodName}
        </p>
      )}
      <div
        className="mt-4 flex gap-2 rounded-xl p-3 text-xs leading-relaxed"
        style={{ background: BLIGHT, color: BLUE }}
      >
        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{p.protectedNote}</span>
      </div>
    </div>
  );
}

export function PaymentInfoSellerCard(p: PaymentInfoSellerProps) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5" style={{ color: V }} />
        <h2 className="text-base" style={{ ...S, fontWeight: 700, color: DARK }}>
          {p.title ?? 'Payout'}
        </h2>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span style={{ color: MUTED }}>{p.saleLabel}</span>
          <span className="font-medium" style={{ color: DARK }}>
            {p.saleAmount}
          </span>
        </div>
        <p className="text-xs" style={{ color: HINT }}>
          {p.saleDetail}
        </p>
        <div className="flex justify-between gap-2">
          <span style={{ color: MUTED }}>{p.commissionLabel}</span>
          <span className="font-medium" style={{ color: DESTRUCTIVE }}>
            {p.commissionFormatted}
          </span>
        </div>
        <div
          className="mt-3 flex justify-between border-t pt-3"
          style={{ borderColor: BORDER }}
        >
          <span className="font-bold" style={{ color: DARK }}>
            {p.netLabel}
          </span>
          <span className="text-xl font-extrabold" style={{ color: V }}>
            {p.netFormatted}
          </span>
        </div>
      </div>
      {p.methodName && (
        <p className="mt-4 text-xs" style={{ color: MUTED }}>
          <span className="font-semibold">{p.methodLabel}</span> {p.methodName}
        </p>
      )}
    </div>
  );
}
