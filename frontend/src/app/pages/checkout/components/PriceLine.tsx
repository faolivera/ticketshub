import { GREEN, DARK, HINT } from "@/lib/design-tokens";

interface PriceLineProps {
  label: string;
  sub: string | null | undefined;
  value: string;
  isDiscount?: boolean;
}

export function PriceLine({ label, sub, value, isDiscount }: PriceLineProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <p style={{ fontSize: 13.5, color: isDiscount ? GREEN : DARK, fontWeight: 500 }}>
          {label}
        </p>
        {sub != null && sub !== "" && (
          <div style={{ fontSize: 11.5, color: isDiscount ? GREEN : HINT, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: isDiscount ? GREEN : DARK,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
