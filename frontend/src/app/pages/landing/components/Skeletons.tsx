import { CARD, BORDER, SHADOW_CARD_MD, SHADOW_CARD_SM, BORD2, R_CARD, R_INPUT, R_BUTTON } from "@/lib/design-tokens";

export function SkeletonSearchBar() {
  const pillWidths = [52, 44, 60, 72, 68];
  return (
    <div style={{ background: CARD, borderRadius: R_CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW_CARD_MD, padding: "14px 18px", marginBottom: 28 }}>
      {/* Desktop skeleton (hidden on mobile via inline media — same class as real bar) */}
      <div className="th-desk-only" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Search input */}
        <div className="sk" style={{ flex: "1 1 220px", height: 38, borderRadius: R_INPUT }} />
        <div style={{ width: 1, height: 28, background: BORD2, flexShrink: 0 }} />
        {/* City picker */}
        <div className="sk" style={{ width: 140, height: 38, borderRadius: R_BUTTON, flexShrink: 0 }} />
        <div style={{ width: 1, height: 28, background: BORD2, flexShrink: 0 }} />
        {/* Category pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {pillWidths.map((w, i) => (
            <div key={i} className="sk" style={{ width: w, height: 30, borderRadius: 100 }} />
          ))}
        </div>
      </div>
      {/* Mobile skeleton */}
      <div className="th-mob-only" style={{ display: "flex", gap: 10 }}>
        <div className="sk" style={{ flex: 1, height: 44, borderRadius: R_INPUT }} />
        <div className="sk" style={{ width: 44, height: 44, borderRadius: R_BUTTON, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: CARD, borderRadius: R_CARD, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: SHADOW_CARD_SM }}>
      {/* Image placeholder */}
      <div className="sk" style={{ width: "100%", aspectRatio: "4/3" }} />
      {/* Content */}
      <div style={{ padding: "12px 13px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="sk" style={{ height: 14, width: "72%", borderRadius: 5 }} />
        <div className="sk" style={{ height: 12, width: "48%", borderRadius: 5 }} />
        <div className="sk" style={{ height: 12, width: "38%", borderRadius: 5, marginTop: 2 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div className="sk" style={{ height: 12, width: "32%", borderRadius: 5 }} />
          <div className="sk" style={{ height: 28, width: "38%", borderRadius: R_BUTTON }} />
        </div>
      </div>
    </div>
  );
}
