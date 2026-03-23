import { MessageCircle } from 'lucide-react';
import { UserReviewsCard } from '@/app/components/UserReviewsCard';
import { CARD, BORDER, DARK, V, S } from '@/lib/design-tokens';
import type { CounterpartCardProps } from './types';

export function CounterpartCard({
  name,
  avatarUrl,
  roleLabel,
  contactLabel,
  onContact,
  contactDisabled,
  userId,
  showProfileLink,
  counterpartRole,
}: CounterpartCardProps) {
  return (
    <div
      className="rounded-card border p-5"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <h2 className="mb-4 text-base" style={{ ...S, fontWeight: 700, color: DARK }}>
        {roleLabel}
      </h2>
      <UserReviewsCard
        userId={userId}
        publicName={name}
        avatarUrl={avatarUrl ?? undefined}
        role={counterpartRole}
        showProfileLink={showProfileLink}
      />
      <button
        type="button"
        onClick={onContact}
        disabled={contactDisabled}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-button py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: V, ...S }}
      >
        <MessageCircle className="h-4 w-4" />
        {contactLabel}
      </button>
    </div>
  );
}
