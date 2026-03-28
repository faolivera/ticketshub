# International Phone Validation

**Date:** 2026-03-28
**Status:** Approved

## Summary

Replace the Argentina-only phone validation (`+549...`) with a permissive international validation (E.164 with known country code check). The frontend split input (prefix + local number) keeps its UX but the prefix becomes editable. The backend receives a single full phone string — no DB or model changes required.

---

## Backend

### `backend/src/common/utils/phone-validator.ts`

- Remove `isValidArgentinaPhone` and the `ARGENTINA_MOBILE_REGEX`.
- Add `isValidInternationalPhone(phone: string): boolean`:
  1. Strip whitespace/dashes; require a leading `+`.
  2. Extract digits after `+`; require total digit count between 7 and 15 (E.164).
  3. Check that the leading digits match one of the ~250 known E.164 country calling codes (static list, 1–4 digits). This rejects clearly invented numbers like `+0...` or `+999...`.
- Keep `normalizePhoneDigits` unchanged (used elsewhere).

### `backend/src/modules/otp/otp.controller.ts`

- Replace `isValidArgentinaPhone(phone)` with `isValidInternationalPhone(phone)`.
- Update the error message to be generic: `'Invalid phone number. Use international format: +[country code][number]'`.

### Tests

- Rewrite `backend/test/unit/common/utils/phone-validator.spec.ts` for the new function:
  - Accepts valid E.164 numbers from multiple countries (`+5491112345678`, `+12025550123`, `+447911123456`, etc.)
  - Rejects numbers without `+`, numbers too short (<7 digits), too long (>15 digits), and invalid country codes (`+0...`, `+999...`).
  - Keeps `normalizePhoneDigits` tests unchanged.
- Existing OTP service unit test fixtures (`+5491112345678`) remain valid and do not need changes — only description strings referencing "Argentina" should be updated if they exist.

---

## Frontend

### `frontend/src/app/components/become-seller/StepPhone.tsx`

**State:**

```
const [prefix, setPrefix]           = useState('+549');
const [localNumber, setLocalNumber] = useState('');
```

The full phone passed to the API is always `prefix.trim() + localNumber.trim()`.

**Prefix input (left side of split):**

- Becomes an editable `<input>` instead of a static `<div>`.
- Fixed width (~80px), same visual style as today (gray background, right border).
- Accepts only `+` followed by digits: `onChange` filters to `/^\+\d*$/`.
- Default value: `+549`.

**Local number input (right side):** unchanged behavior — digits only.

**Loading existing phone (`useEffect`):**

When `user.phone` exists and is unverified, split it for display. All currently stored numbers are `+549XXXXXXXXXX`. Going forward, numbers may use any country code. Split rule:

1. If the value starts with `+549`, set `prefix = '+549'`, `localNumber = rest`.
2. Otherwise, if it starts with `+`, set `prefix = '+'`, `localNumber = digits after '+'`. The user will need to manually fix the prefix — acceptable since this edge case won't exist until international numbers are entered.
3. Fallback: `prefix = '+549'`, `localNumber = all digits`.

**Validation before submit:**

Inline check before calling the API: `(prefix + localNumber)` must match `/^\+[1-9]\d{6,14}$/` (starts with `+`, non-zero first digit, 7–15 total digits). Shows an inline error if invalid, does not call the API.

**Displayed phone in verify phase:**

The "code sent to" message shows `prefix + localNumber` (the full number), same as today.

**i18n:**

No new translation keys needed. The placeholder for the local number field may be updated to be less Argentina-specific (e.g., remove the `9...` hint if present).

---

## What does NOT change

- Database schema and Prisma model — phone is stored as a single string.
- `normalizePhoneDigits` utility.
- OTP flow logic (send/verify/resend).
- All other files that reference `user.phone` — they receive the same single string as before.
- The visual design of the split input (only the left part becomes editable).
