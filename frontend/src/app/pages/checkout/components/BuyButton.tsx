import { Loader2, Shield } from "lucide-react";
import { V, BORD2, MUTED, WARN_SOLID, S } from "@/lib/design-tokens";

interface BuyButtonProps {
  label: string;
  variant: "primary" | "warn" | "disabled";
  onClick: (() => void) | undefined;
  total: string | null;
  disabled: boolean;
  isLoading: boolean;
}

export function BuyButton({ label, variant, onClick, total, disabled, isLoading }: BuyButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: V, color: "white", cursor: "pointer", opacity: 1 },
    warn: { background: WARN_SOLID, color: "white", cursor: "not-allowed", opacity: 1 },
    disabled: { background: BORD2, color: MUTED, cursor: "not-allowed", opacity: 0.8 },
  };
  const st = styles[variant] || styles.disabled;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "13px 16px",
        borderRadius: 12,
        border: "none",
        fontSize: 14,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.18s",
        ...S,
        ...st,
      }}
    >
      {isLoading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        variant === "primary" && <Shield size={15} />
      )}
      <span>
        {label}
        {total ? ` · ${total}` : ""}
      </span>
    </button>
  );
}
