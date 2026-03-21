import type { Offer } from "@/api/types/offers";

export function isPricingSnapshotExpiredError(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  const code = e?.code;
  const message = e?.message;
  return (
    (code != null && String(code).startsWith("PRICING_SNAPSHOT_")) ||
    (code === "BAD_REQUEST" &&
      typeof message === "string" &&
      message.includes("Pricing snapshot has expired"))
  );
}

export function isListingUnavailableError(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  const code = String(e?.code ?? "");
  const msg = ((e?.message as string) ?? "").toLowerCase();
  return (
    ["LISTING_NOT_AVAILABLE", "TICKET_NOT_AVAILABLE", "UNITS_UNAVAILABLE", "SOLD_OUT"].includes(
      code
    ) ||
    msg.includes("not available") ||
    msg.includes("sold out") ||
    msg.includes("no longer available")
  );
}

export function getExpiredReason(offer: Offer | null): string | null {
  if (!offer) return null;
  if (offer.expiredReason) return offer.expiredReason;
  return offer.acceptedAt ? "buyer_no_purchase" : "seller_no_response";
}
