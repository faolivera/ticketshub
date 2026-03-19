import { MessageCircle } from 'lucide-react';
import { UserReviewsCard } from '@/app/components/UserReviewsCard';
import { CARD, BORDER, DARK, V, E, S } from '@/lib/design-tokens';
import type { CounterpartCardProps } from './types';

export function CounterpartCard({
  name,
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
      className="rounded-[14px] border p-5"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <h2 className="mb-4 text-base font-normal" style={{ ...E, color: DARK }}>
        {roleLabel}
      </h2>
      <UserReviewsCard
        userId={userId}
        publicName={name}
        role={counterpartRole}
        showProfileLink={showProfileLink}
      />
      <button
        type="button"
        onClick={onContact}
        disabled={contactDisabled}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: V, ...S }}
      >
        <MessageCircle className="h-4 w-4" />
        {contactLabel}
      </button>
    </div>
  );
}
