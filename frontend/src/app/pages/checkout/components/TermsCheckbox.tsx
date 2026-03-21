import { ClientTnC } from "@/app/components/ClientTnC";
import { BORDER } from "@/lib/design-tokens";

interface TermsCheckboxProps {
  needsTerms: boolean;
  termsVersion: string | null;
  isLoading: boolean;
  accepted: boolean;
  onChange: (v: boolean) => void;
}

export function TermsCheckbox({
  needsTerms,
  termsVersion,
  isLoading,
  accepted,
  onChange,
}: TermsCheckboxProps) {
  if (!needsTerms) return null;

  return (
    <div style={{ padding: "14px 22px", borderBottom: `1px solid ${BORDER}` }}>
      <ClientTnC
        termsVersionId={termsVersion}
        termsLoading={isLoading}
        checked={accepted}
        onCheckedChange={onChange}
        checkboxId="checkout-buy-terms"
      />
    </div>
  );
}
