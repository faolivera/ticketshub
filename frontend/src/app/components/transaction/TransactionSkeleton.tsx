import { BG, CARD, BORDER, DARK, S, BLIGHT } from '@/lib/design-tokens';
import { TransactionLayout } from './TransactionLayout';

/* ─── shimmer bone ─────────────────────────────────────────────────────────── */
function Bone({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`txsk-bone ${className}`} style={style} />;
}

/* ─── skeleton cards ────────────────────────────────────────────────────────── */
function EventCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[16px] border shadow-sm"
      style={{ background: CARD, borderColor: BORDER }}
    >
      {/* banner */}
      <Bone className="h-44 w-full sm:h-52 md:h-56" />
      {/* bottom overlay row */}
      <div className="flex flex-col gap-2 p-4 sm:p-5">
        <Bone className="h-6 w-3/5 rounded-md" />
        <div className="flex gap-2">
          <Bone className="h-4 w-28 rounded-md" />
          <Bone className="h-4 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function StepperSkeleton() {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ background: CARD, borderColor: BORDER }}
    >
      <Bone className="mb-4 h-4 w-32 rounded-md" />
      <div className="flex items-center gap-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center">
            <Bone className="h-8 w-8 shrink-0 rounded-full" style={{ minWidth: 32 }} />
            {i < 3 && <Bone className="h-1 flex-1 rounded-full" />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-3 rounded-md" style={{ width: '18%' }} />
        ))}
      </div>
    </div>
  );
}

function ActionCardSkeleton() {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ background: CARD, borderColor: BORDER }}
    >
      <Bone className="mb-4 h-5 w-40 rounded-md" />
      <div className="flex flex-col gap-3">
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-5/6 rounded-md" />
        <Bone className="h-3 w-4/6 rounded-md" />
      </div>
      <Bone className="mt-5 h-11 w-full rounded-[10px]" />
    </div>
  );
}

function TxMetaSkeleton() {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ background: CARD, borderColor: BORDER }}
    >
      <Bone className="mb-3 h-4 w-28 rounded-md" />
      <div className="flex flex-col gap-3">
        <Bone className="h-3 w-40 rounded-md font-mono" />
        <Bone className="h-3 w-24 rounded-md" />
        <Bone className="h-3 w-32 rounded-md" />
      </div>
    </div>
  );
}

function EscrowCardSkeleton() {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ background: BLIGHT, borderColor: '#1e3a5f40' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Bone className="h-5 w-5 shrink-0 rounded-full" />
        <Bone className="h-4 w-32 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-5/6 rounded-md" />
        <Bone className="h-3 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

function CounterpartCardSkeleton() {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ background: CARD, borderColor: BORDER }}
    >
      <Bone className="mb-4 h-4 w-24 rounded-md" />
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Bone className="h-3 w-28 rounded-md" />
          <Bone className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <Bone className="mt-4 h-11 w-full rounded-[10px]" />
    </div>
  );
}

/* ─── main export ───────────────────────────────────────────────────────────── */
export function TransactionSkeleton() {
  return (
    <>
      {/* shimmer keyframe — injected once per render */}
      <style>{`
        @keyframes txsk-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .txsk-bone {
          background: linear-gradient(
            90deg,
            #e8e7e3 0%,
            #f0efec 40%,
            #e8e7e3 80%
          );
          background-size: 600px 100%;
          animation: txsk-shimmer 1.6s ease-in-out infinite;
        }
      `}</style>

      <TransactionLayout
        backButton={
          <Bone className="mb-2 h-8 w-24 rounded-lg" style={{ ...S }} />
        }
        mainColumn={
          <>
            <EventCardSkeleton />
            <StepperSkeleton />
            <ActionCardSkeleton />
          </>
        }
        sidebar={
          <>
            <TxMetaSkeleton />
            <EscrowCardSkeleton />
            <CounterpartCardSkeleton />
          </>
        }
      />
    </>
  );
}
