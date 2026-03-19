import type { ReactNode } from 'react';
import { BG, DARK, S } from '@/lib/design-tokens';

export interface TransactionLayoutProps {
  backButton: ReactNode;
  topBanner?: ReactNode;
  mainColumn: ReactNode;
  sidebar: ReactNode;
}

export function TransactionLayout({
  backButton,
  topBanner,
  mainColumn,
  sidebar,
}: TransactionLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ ...S, background: BG, color: DARK }}
    >
      <div className="mx-auto max-w-[1000px] px-4 pb-12 pt-4 sm:px-6">
        {backButton}
        {topBanner}
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">{mainColumn}</div>
          <div className="flex flex-col gap-5">{sidebar}</div>
        </div>
      </div>
    </div>
  );
}
