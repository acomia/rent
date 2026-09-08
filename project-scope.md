# RENT APP — Project Scope

## Problem

Renting a gown or costume is hard for customers because they can't easily see available designs, sizes, prices, and booking dates. This leads to wasted trips, unavailable items, sizing problems, unclear rental terms, and disputes about fees or returns.

For shop owners, managing rentals manually causes double bookings, lost records, late returns, untracked damages, and poor customer service. They need to coordinate reservations, payments, deposits, returns, damages, cleaning, and inventory status — usually across paper notebooks, group chats, and memory.

## Solution

A mobile app for customers to browse, search, and reserve gowns and costumes online, paired with a mobile admin tool for the shop to manage inventory, bookings, payments, deposits, returns, damages, and customer records. Built for a single shop in v1, with a data model flexible enough to extend to a marketplace later.

---

## Observed Workflow (how a rental actually happens today)

One rental, as it runs right now without any app. This is **field observation, not a
spec** — a single reported scenario, so treat the steps as real and the reasons
behind them as unconfirmed. It matters because it is the workflow the app has to
be better than, and in three places the app currently assumes something different.

1. **The customer messages the shop on Facebook.** Not a website, not a phone
   call — Messenger. This is the top of the funnel today.
2. **The customer asks what size the item is.** This is the _first_ question, before
   price and before dates. Sizing is the thing a photo cannot answer.
3. **The owner replies with the details** — photos and sizes — by hand, in chat, per
   customer, repeating it for every enquiry.
4. **The customer decides they want it, and sends a deposit.** How the deposit amount
   is arrived at is **not known** — see Open Item #2. It is sent before any dates are
   settled.
5. **Then the customer schedules the date they need the item.** Deposit first, dates
   second — the reverse of the app's order.
6. **On the day, the customer books a Lalamove to collect it.** The _customer_ books
   the rider, not the shop. Sometimes they book it the night before the date they
   need the item, so the piece leaves the shop a day early.

**What this tells us, and what it costs:**

- **The conversation is the product today.** Steps 1–3 are pure catalog lookup that
  the shop performs manually, one customer at a time. That is the clearest win the
  app has: a browsable catalog with sizes answers steps 2–3 without the owner typing
  anything. It also means in-app messaging being a v2 item (see v2 list) is a bigger
  risk than it first looked — customers arrive expecting to be able to ask.
- **Sizing is the primary objection, not price.** Item sizes, the size guide and clear
  fit information are load-bearing conversion features, not nice-to-haves.
- **The deposit rule is unknown.** The app currently ships a per-item deposit because
  that is what the schema needed, not because the shop's rule was observed. Confirm
  it before launch — see Open Item #2.
- **"Delivery" already exists in practice, and the customer arranges it.** This is the
  answer to half of Open Item #7: nobody needs a courier integration for the observed
  flow, because the customer books their own rider. What the shop needs is to know a
  rider is coming and to be able to hand the item to someone who is not the customer.
- **Collection can precede the rental date.** A rider booked the night before means the
  item is physically out of the shop before the date the booking calls "pickup". Any
  logic that blocks dates or decides "out now" has to survive that.

**Not covered by this scenario:** the return leg, cleaning, late returns, damage, and
what happens when the item does not fit on arrival. Nothing in the return half of the
product is validated by this observation.

---

## Key Decisions (locked in)

| Area          | Decision                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform      | Mobile-first, iOS + Android (customers and admin both on mobile)                                                                                                                                                                        |
| Shop model    | Single shop in v1; data model designed marketplace-ready for v2                                                                                                                                                                         |
| Payments      | Hybrid — online deposit to confirm booking, balance paid on pickup                                                                                                                                                                      |
| Fulfillment   | v1: shop pickup + in-shop fitting appointments. Shop-operated delivery deferred to v1.1 (see Open Item #7). **Customer-arranged courier (Lalamove) is how it already happens** — the customer books the rider; the shop only hands over |
| Notifications | In-app push + email; SMS for overdue + pickup alerts in v1 (time-sensitive, push/email unreliable in PH)                                                                                                                                |
| v1 priority   | Full booking flow with payments + notifications; defer reports, damage monitoring, and the richer cleaning workflow to v2 (a minimal cleaning buffer stays in v1 — see below)                                                           |
| Target user   | A real shop is in mind; no committed shop owner yet — features should match observed PH rental shop workflows                                                                                                                           |

---

## Open Items (must decide before build)

> **Status as of Phase 4.** Most of these are now decided in code, not just on
> paper. #1, #2, #3, #6 and #8 are **resolved**; #5 is v2 and #7 is v1.1; **#4
> (cancellation & no-show policy) is the one still open, and it now blocks
> shipped behaviour** — Cancel booking already exists in the app and simply sets
> `status = 'cancelled'` with no refund window, no deposit-forfeit rule, and no
> record of who cancelled or why. Each resolution is annotated inline below;
> `implementation-plan.md` holds the same table keyed by phase.

The remainder block downstream design.

> **Resolve #1 first, on its own.** It is not peer to the others — the availability checker, booking/slot-blocking, inventory status, and the marketplace-ready data model all inherit their shape from it. Nearly every other decision depends on it.

1. **Inventory model** _(foundational — decide before anything else)_ — does the shop ever stock two of the same design (e.g., the same wedding gown in M and L, or two copies of a popular debut gown)?
   - If **yes** → "design + units" model: each listing represents a design, with individually tracked physical units underneath.
   - If **no** → "one listing = one item" model (simpler, but unrealistic for most real shops).
   - **Leaning yes** — a real PH rental shop routinely stocks the same design in multiple sizes/copies. Confirm with the shop, then build design + units.
   - **RESOLVED — design + units.** `items` + `item_units` (`src/db/0002_catalog.sql`); bookings key on `unit_id`.
2. **Pricing rules** — flat per rental, per-day, or weekend tier? Long-rental discount? Does deposit scale with item value or is it flat?
   - **Rental fee: RESOLVED — flat per-day.** `items.rental_fee_per_day`; no weekend tier and no long-rental discount in v1.
   - **Deposit: STILL OPEN.** The app ships a flat per-item deposit (`items.deposit`) because the schema needed a number, **not because the shop's rule was observed** — in the real flow the customer sends a deposit and how the amount is arrived at is unknown. Confirm before launch. If it turns out to scale with item value, or to be negotiated per customer, `items.deposit` is the wrong shape and every money block in the booking flow reads from it.
3. **Cleaning buffer** — how many days is an item unavailable after return (fixed across shop, or per-item)?
   - **RESOLVED — per item.** `items.cleaning_buffer_days`, snapshotted onto each booking so changing an item's buffer later cannot move existing blocked ranges.
4. **Cancellation & no-show policy** _(STILL OPEN — and now the most urgent, because the action already ships)_ — refund windows, deposit forfeit rules, shop-initiated cancellation handling. Must also settle **refund mechanics**: is the online deposit refundable via the gateway, and who absorbs gateway fees on a refund?
5. **Penalty formula** — late fee per day, cap (e.g., capped at item value), damage fee structure (pre-set tiers vs. admin-judged per incident).
6. **Customer trust / KYC** — _phone OTP is decided (required at registration)._ Still open: whether to add ID upload and/or a tiered deposit (full for first-timers, reduced for repeat customers) on top of OTP before launch.
   - **RESOLVED for v1 — OTP only.** `customers` keeps nullable `id_document_url` and `deposit_tier`, so either bolts on later with no migration.
7. **Delivery specifics** — splits in two now that the real flow is known:
   - **7a. Customer-arranged courier — OBSERVED, and already happening.** The customer books their own Lalamove and it collects from the shop, sometimes the night before the date they need the item. No integration, no service area, no fee model, no rider booking: the shop's only new need is to _expect_ a rider and to hand the item to someone who is not the customer. Cheap enough to be a v1 fulfilment option — see `implementation-plan.md` Phase 7a. **Needs a decision on whether it enters v1.**
   - **7b. Shop-operated delivery** _(still deferred to v1.1 — does not block v1)_ — service area, fee model (flat / distance-based / pass-through), who books the rider, whether returns are also collected. This is the version that needs a maps SDK and a courier account, and nothing observed so far requires it.
8. **Admin roles** — split into **owner** (revenue, settings, all data) and **staff** (bookings only, no financial visibility), or single admin role for v1? Decide before finalizing the Audit Log (#31), whose schema depends on it.
   - **RESOLVED — single role for v1.** Presence of an `admins` row _is_ admin; nullable `role` defaults to `owner` so the split bolts on later.

---

## v1 Features

### Customer Features

**Accounts**

1. **User Registration** — email + password; phone number required for OTP verification (see Open Item #6).
2. **User Login**.
3. **Customer Profile** — name, contact number, email, address, ID document (if KYC chosen), rental history.

**Browsing & Discovery** 4. **Online Catalog** — gowns and costumes with photos, descriptions, prices, sizes, and categories. 5. **Search** — by name or keyword. 6. **Filters** — category, size, color, price, occasion, availability date. 7. **Item Details Page** — full info: rental price, deposit, size, color, rental rules, fitting requirement, photos. 8. **Availability Checker** — calendar view showing available / reserved / rented / under-cleaning / unavailable status per date.

**Booking** 9. **Booking / Reservation** — customer selects item and dates; system blocks the slot and the cleaning-buffer days afterward (buffer length per Open Item #3). This minimal buffer is in v1; the richer cleaning-queue workflow is v2. 10. **Rental Date Selection** — pickup and return dates. 11. **Fulfillment Choice** — shop pickup or in-shop fitting appointment. (Shop-operated delivery is v1.1 — see Open Item #7b. **Customer-arranged courier pickup is the observed real-world third case and is not yet modelled** — see the Observed Workflow section and Open Item #7a.) A fitting may be booked before reserving; a fitting does **not** hold the rental slot — only a confirmed reservation blocks dates. 12. **Booking Status Tracking** — pending / approved / rejected / picked up / rented / returned / completed / cancelled. Tracked **separately** from payment state (deposit paid / balance due / refunded / forfeited) — the two are orthogonal.

**Payments** 13. **Online Deposit Payment** — required to confirm reservation; held by payment gateway (e.g., GCash, cards). Balance paid in-shop on pickup. 14. **Payment Details Screen** — rental fee, deposit (paid), balance (due on pickup), penalties, refunds. In v1 penalties/late fees are **admin-entered and displayed** only; automated calculation from a formula is v2 (Open Item #5).

**Notifications & History** 15. **Notifications** (push + email; **SMS** for pickup reminder + overdue alert) — booking approval/rejection, payment receipt, pickup reminder, return reminder, overdue alert. 16. **Rental History** — past and current rentals with status, payments, receipts.

### Admin Features

**Access** 17. **Admin Login** — single admin role in v1 unless owner/staff split is decided (Open Item #8). 18. **Admin Dashboard** — today's pickups, today's returns, pending approvals, items under cleaning, overdue rentals, unpaid balances.

**Catalog & Inventory** 19. **Manage Gowns and Costumes** — add, edit, delete listings. 20. **Upload Item Photos** — multiple photos per item. 21. **Manage Categories** — wedding, debut, formal, cosplay, school costume, etc. 22. **Inventory Status Management** — mark items available / reserved / rented / under cleaning / damaged / unavailable. Final structure depends on Open Item #1.

**Operations** 23. **Booking Management** — approve, reject, cancel, or update reservations. 24. **Customer Management** — view customer details, rental records, flagged customers. 25. **Payment Tracking** — record deposits paid online, balance paid in-shop, partial payments, refunds, admin-entered late fees. 26. **Return Management** — record returned items; move the item into its cleaning-buffer window (dates auto-blocked); record balance settlement. The richer cleaning-queue workflow is v2. 27. **Fitting Appointment Management** — view, confirm, reschedule, or cancel fitting slots.

### Operational / Legal (v1)

28. **Terms & Conditions** acceptance on signup.
29. **Privacy Policy** (compliant with PH Data Privacy Act).
30. **Receipts** — auto-generated for online deposit and final balance.
31. **Audit Log** — who (admin) approved, refunded, cancelled, or modified bookings.

---

## v2 Features (deferred)

- Damage Monitoring (record damaged/stained/incomplete returns with photos and cost)
- Penalty Management (automated calculation per rules in Open Item #5)
- Cleaning Status Management (richer workflow/queue for items in cleaning — the minimal date-blocking buffer ships in v1)
- Reports — income, most-rented items, overdue, damages
- SMS notifications for the remaining events (approval/rejection, receipts, return reminder — pickup + overdue SMS ship in v1)
- Reviews / ratings (customer rates item; admin flags customer)
- Wishlist / favorites
- Promo codes / discounts / loyalty
- Customer ↔ shop in-app messaging — **but note this is the channel the business runs on today** (Facebook Messenger). Deferring it is a real bet: that a good enough catalog with sizes removes most of the reason customers message at all. If it doesn't, the conversation carries on in Messenger beside an app that cannot see it, and the shop keeps answering the same questions by hand.
- Multi-shop / marketplace expansion (shop accounts, payouts, commissions)
- Owner vs. staff role split (if not done in v1)

---

## Out of Scope

- Sale of items (rental only)
- Tailoring / alteration services — **but note the conflict:** the item detail
  screen now lists "Free alterations (selected sizes)" as a shop promise, and the
  new size-guide screen explains how alterations work. Nothing in the app
  _books or tracks_ an alteration, so the scope line still holds as an engineering
  boundary, but the app is making a customer-facing promise this document
  excludes. Either the promise comes off the screens or this line needs
  rewording — a shop-policy call, not a code one.
- Multi-currency or multi-language (PH market, Filipino + English; PHP only)
- POS / accounting integration

---

## Known Risks

- **Customers may not leave Messenger.** The whole funnel starts on Facebook today, and an app with no messaging cannot absorb steps 1–3 of the observed workflow — it can only make them unnecessary. If customers still want to ask before booking, the shop ends up running both channels and the app becomes extra work rather than less. Watch this in the Phase 10 beta specifically; it is the assumption most likely to be wrong.
- **Sizing is the real conversion blocker.** The first question asked today is "what size is it". If item sizes, the size guide or the photos are thin, customers will fall back to messaging regardless of what the app can do.
- **Notification reach** — push + email alone may not reliably reach PH customers for time-sensitive alerts. Addressed: SMS ships in v1 for pickup + overdue; extend to other events in v2 if push adoption stays low.
- **Fraud / no-shows** — handing physical items to strangers is high-risk. Phone OTP is decided for v1; still confirm whether ID upload / tiered deposit are needed before launch (Open Item #6).
- **Delivery complexity** — mostly dissolved rather than deferred: the observed flow has the _customer_ booking the courier, so v1 never needs a courier integration or a fee model. What remains is a handover problem (a rider, not the customer, arrives at the counter — possibly a day early), which is cheap to model. Shop-operated delivery stays v1.1.
- **Marketplace-ready data model** — small upfront cost; pays off only if v2 marketplace actually happens. Don't over-engineer.
