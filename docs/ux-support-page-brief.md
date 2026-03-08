# UX Brief: Support Cases — Track Your Requests

**Product:** TicketsHub  
**Feature:** Support hub — user-facing page to view and follow support cases  
**Audience:** UX designer  
**Date:** 2026-03-09

---

## 1. Context and problem

We have a ticket system where users can:

- Submit support requests from a **Contact** form (with or without being logged in).
- Open **disputes** from a transaction (e.g. “ticket not received”, “ticket didn’t work”).

The backend already supports: listing a user’s tickets, opening a ticket detail, adding messages, and closing a ticket. **What’s missing is a dedicated place where the user can see all their support cases and follow each one** (read updates, reply, see status). Today they have no clear way to track their requests after submitting.

**Goal:** Design a **Support** experience (page/section) so that users can easily **list their cases** and **follow each case** (status, history, replies), with a focus on **mobile and desktop**.

---

## 2. What we need designed

Please design:

1. **Support hub / list view**  
   A view where the user sees their support cases (e.g. list or cards). It should work on **mobile and desktop** and make it easy to:
   - See at a glance: subject, status, date, and optionally category/source (e.g. dispute vs contact).
   - Tell which cases need attention (e.g. new reply, “waiting for you”).
   - Open a case to see details and conversation.
   - Optionally: open a new support request from here (or we keep that on Contact; your call in the flow).

2. **Case detail / conversation view**  
   A view for a single case where the user can:
   - See case metadata: subject, status, dates, category/source, and if linked to a transaction.
   - Read the full **conversation** (chronological messages: user + support team).
   - **Reply** (add a message) when the case is still open.
   - See clearly when the case is closed or resolved.
   - Optionally: close the case themselves if we allow it.

Consider:

- **Empty state:** User has no support cases yet (e.g. short explanation + CTA to contact support or go to Contact).
- **Filtering/sorting:** e.g. by status (open / in progress / resolved / closed) or by date; keep it simple and mobile-friendly.
- **Responsiveness:** Layout and interactions must be comfortable on **mobile** (thumb zones, tap targets, readability) and **desktop** (e.g. list + detail side-by-side or stacked; your recommendation).

---

## 3. Data and statuses (for UI copy and states)

Use these only as reference for labels and states; exact wording can be adapted to the design system.

**Case statuses:**

- **Open** — Just created, not yet picked up.
- **In progress** — Support is working on it.
- **Waiting for customer** — Support replied and is waiting for the user.
- **Resolved** — Issue resolved (e.g. dispute outcome).
- **Closed** — Case closed (e.g. user or support closed it).

**Case types / origin (optional to show):**

- Dispute (from a transaction).
- Contact from a transaction.
- General contact form.

**Per case we have:**

- Subject, description, category.
- Status and priority (we may or may not show priority in the UI).
- Created/updated dates.
- If linked: transaction reference (e.g. event name, order id).
- Thread of messages (user vs support), each with date and content.

---

## 4. Constraints and technical notes

- **Auth:** Listing and following cases is for **logged-in users**. Guests who used the contact form don’t have a “my cases” list unless we add a separate flow (e.g. magic link by email); for this brief, **focus on the logged-in experience**.
- **APIs exist:** List tickets, get one ticket (with messages), add message, close ticket. No need to design new APIs; the UI should align with these actions.
- **i18n:** All user-facing text will be translated (e.g. Spanish + English). Prefer clear, concise labels and avoid long sentences in fixed-width components.

---

## 5. Deliverables we need

1. **Support hub (list)**
   - Mobile: wireframes or high-fidelity (your process).
   - Desktop: same.
   - States: with cases, empty, loading (optional).
   - Any filters/sorts and how they behave.

2. **Case detail (conversation)**
   - Mobile and desktop.
   - States: with messages, empty thread, “waiting for customer” emphasis, closed/resolved.
   - Input area for replying and any validation/feedback.

3. **Navigation and entry**
   - Where “Support” or “My cases” lives (e.g. main nav, account menu, dashboard).
   - How user gets from list → detail and back.

4. **Optional**
   - Short flow: “I have a problem” → choose “new case” vs “see existing cases” (if you recommend it).
   - Accessibility and key interactions (e.g. focus order, keyboard, screen readers) if part of your deliverable set.

---

## 6. Success criteria

- A user can **find their support cases** in one place.
- They can **open a case** and **read the full conversation** without confusion.
- They can **reply** when the case is open in a clear, obvious way.
- **Status** is visible and understandable (open, in progress, waiting for you, resolved, closed).
- The experience is **easy to use on mobile and desktop** (responsive, readable, tappable/clickable).
- The flow fits our existing app (navigation, visual language) and stays simple; no unnecessary steps.

---

## 7. Open questions for the designer

- List + detail: on desktop, do you prefer **split view** (list left, detail right) or **separate pages** (list then full-screen detail)? Consider content density and future growth (e.g. many cases).
- How do we best surface “waiting for customer” (e.g. badge, sort, or separate section)?
- For “open new case” from the support hub: same page (e.g. modal or inline form) or redirect to existing Contact page?

Thanks for designing this — we’ll use your screens and flows to implement the Support page in the app.
