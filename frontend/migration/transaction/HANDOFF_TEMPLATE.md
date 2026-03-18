# Handoff brief template

## Context

Transaction page migration (`/transaction/:id`). Logic lives in `MyTicket.tsx`; this task is UI only unless stated.

## In scope

- Files listed below.
- Use `frontend/src/app/components/transaction/types.ts` for props.
- Use `tokens.ts` (`TX`, `txFontSans`, `txFontDisplay`) for colors/typography.
- All user-facing strings via `useTranslation` / i18n keys.

## Out of scope

- API calls, BFF, Socket.IO, services.
- Changing handler names or state shape in `MyTicket.tsx` (unless brief says integrate).

## Files

(list paths to create or edit)

## Props reference

(paste interface name from `types.ts` or list props)

## Done when

- [ ] Typecheck passes for touched files.
- [ ] No new logic duplicated (parent owns state).
