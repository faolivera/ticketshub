import type { ComponentProps } from 'react';
import { Calendar } from '@/app/components/ui/calendar';
import { cn } from '@/app/components/ui/utils';
import { V, V_HOVER, VLIGHT, DARK, HINT, BORDER, BORD2 } from '@/lib/design-tokens';

/**
 * Tailwind arbitrary color classes — hex values must match @/lib/design-tokens (JIT scans these literals).
 * @see V, V_HOVER, VLIGHT, DARK, HINT, BORDER, BORD2 in design-tokens.js
 */
const TH_SELECTED = `bg-[${V}] text-white hover:bg-[${V_HOVER}] hover:text-white focus:bg-[${V}] focus:text-white`;
const TH_TODAY = `bg-[${VLIGHT}] text-[${V_HOVER}] font-semibold`;

export type TicketsHubCalendarProps = ComponentProps<typeof Calendar>;

/**
 * Date picker month grid styled for TicketsHub (violet primary, rounded cells).
 * Wraps shadcn Calendar (react-day-picker).
 */
export function TicketsHubCalendar({
  className,
  classNames,
  ...props
}: TicketsHubCalendarProps) {
  return (
    <Calendar
      showOutsideDays
      className={cn('rounded-[11px] border-0 p-2', className)}
      classNames={{
        months: 'flex flex-col gap-2',
        month: 'flex flex-col gap-3',
        caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: `text-sm font-semibold text-[${DARK}]`,
        nav: 'flex items-center gap-1',
        nav_button: cn(
          'inline-flex size-8 items-center justify-center rounded-lg border bg-white font-normal',
          `border-[${BORDER}] text-[${V}] hover:bg-[${VLIGHT}]`,
        ),
        nav_button_previous: 'absolute left-0.5',
        nav_button_next: 'absolute right-0.5',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell: `w-9 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[${HINT}]`,
        row: 'mt-1 flex w-full',
        cell: 'relative p-0 text-center text-sm',
        day: cn(
          `size-9 rounded-lg p-0 font-normal text-[${DARK}]`,
          `hover:bg-[${VLIGHT}] aria-selected:opacity-100`,
        ),
        day_selected: TH_SELECTED,
        day_today: TH_TODAY,
        day_outside: `text-[${HINT}] aria-selected:text-white/80`,
        day_disabled: `text-[${BORD2}] opacity-40`,
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
