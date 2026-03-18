import type { ComponentProps } from 'react';
import { Calendar } from '@/app/components/ui/calendar';
import { cn } from '@/app/components/ui/utils';

/** Purple accent tokens aligned with seller verification / TicketsHub identity UI */
const TH_SELECTED =
  'bg-[#6d28d9] text-white hover:bg-[#5b21b6] hover:text-white focus:bg-[#6d28d9] focus:text-white';
const TH_TODAY = 'bg-[#f0ebff] text-[#5b21b6] font-semibold';

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
        caption_label: 'text-sm font-semibold text-[#0f0f1a]',
        nav: 'flex items-center gap-1',
        nav_button:
          'inline-flex size-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6d28d9] hover:bg-[#f0ebff]',
        nav_button_previous: 'absolute left-0.5',
        nav_button_next: 'absolute right-0.5',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell:
          'w-9 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[#9ca3af]',
        row: 'mt-1 flex w-full',
        cell: 'relative p-0 text-center text-sm',
        day: cn(
          'size-9 rounded-lg p-0 font-normal text-[#0f0f1a]',
          'hover:bg-[#f0ebff] aria-selected:opacity-100',
        ),
        day_selected: TH_SELECTED,
        day_today: TH_TODAY,
        day_outside: 'text-[#9ca3af] aria-selected:text-white/80',
        day_disabled: 'text-[#d1d5db] opacity-40',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
