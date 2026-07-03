# RENT APP — Project Scope

## Problem

Renting a gown or costume is hard for customers because they can't easily see available designs, sizes, prices, and booking dates. This leads to wasted trips, unavailable items, sizing problems, unclear rental terms, and disputes about fees or returns.

For shop owners, managing rentals manually causes double bookings, lost records, late returns, untracked damages, and poor customer service. They need to coordinate reservations, payments, deposits, returns, damages, cleaning, and inventory status — usually across paper notebooks, group chats, and memory.

## Solution

A mobile app for customers to browse, search, and reserve gowns and costumes online, paired with a mobile admin tool for the shop to manage inventory, bookings, payments, deposits, returns, damages, and customer records. Built for a single shop in v1, with a data model flexible enough to extend to a marketplace later.

---

## Key Decisions (locked in)

| Area          | Decision                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform      | Mobile-first, iOS + Android (customers and admin both on mobile)                                                                                                              |
| Shop model    | Single shop in v1; data model designed marketplace-ready for v2                                                                                                               |
| Payments      | Hybrid — online deposit to confirm booking, balance paid on pickup                                                                                                            |
| Fulfillment   | v1: shop pickup + in-shop fitting appointments. Delivery deferred to v1.1 (mechanics unresolved — see Open Item #7)                                                           |
| Notifications | In-app push + email; SMS for overdue + pickup alerts in v1 (time-sensitive, push/email unreliable in PH)                                                                      |
| v1 priority   | Full booking flow with payments + notifications; defer reports, damage monitoring, and the richer cleaning workflow to v2 (a minimal cleaning buffer stays in v1 — see below) |
| Target user   | A real shop is in mind; no committed shop owner yet — features should match observed PH rental shop workflows                                                                 |

---

## Open Items (must decide before build)

These are unresolved and block downstream design.

> **Resolve #1 first, on its own.** It is not peer to the others — the availability checker, booking/slot-blocking, inventory status, and the marketplace-ready data model all inherit their shape from it. Nearly every other decision depends on it.

1. **Inventory model** _(foundational — decide before anything else)_ — does the shop ever stock two of the same design (e.g., the same wedding gown in M and L, or two copies of a popular debut gown)?
   - If **yes** → "design + units" model: each listing represents a design, with individually tracked physical units underneath.
   - If **no** → "one listing = one item" model (simpler, but unrealistic for most real shops).
   - **Leaning yes** — a real PH rental shop routinely stocks the same design in multiple sizes/copies. Confirm with the shop, then build design + units.
2. **Pricing rules** — flat per rental, per-day, or weekend tier? Long-rental discount? Does deposit scale with item value or is it flat?
3. **Cleaning buffer** — how many days is an item unavailable after return (fixed across shop, or per-item)?
4. **Cancellation & no-show policy** — refund windows, deposit forfeit rules, shop-initiated cancellation handling. Must also settle **refund mechanics**: is the online deposit refundable via the gateway, and who absorbs gateway fees on a refund?
5. **Penalty formula** — late fee per day, cap (e.g., capped at item value), damage fee structure (pre-set tiers vs. admin-judged per incident).
6. **Customer trust / KYC** — _phone OTP is decided (required at registration)._ Still open: whether to add ID upload and/or a tiered deposit (full for first-timers, reduced for repeat customers) on top of OTP before launch.
7. **Delivery specifics** _(deferred to v1.1 — no longer blocks v1)_ — service area, fee model (flat / distance-based / pass-through to courier like Lalamove), who books the rider, whether returns are also delivered.
8. **Admin roles** — split into **owner** (revenue, settings, all data) and **staff** (bookings only, no financial visibility), or single admin role for v1? Decide before finalizing the Audit Log (#31), whose schema depends on it.

---

## v1 Features

### Customer Features

**Accounts**

1. **User Registration** — email + password; phone number required for OTP verification (see Open Item #6).
2. **User Login**.
3. **Customer Profile** — name, contact number, email, address, ID document (if KYC chosen), rental history.

**Browsing & Discovery** 4. **Online Catalog** — gowns and costumes with photos, descriptions, prices, sizes, and categories. 5. **Search** — by name or keyword. 6. **Filters** — category, size, color, price, occasion, availability date. 7. **Item Details Page** — full info: rental price, deposit, size, color, rental rules, fitting requirement, photos. 8. **Availability Checker** — calendar view showing available / reserved / rented / under-cleaning / unavailable status per date.

**Booking** 9. **Booking / Reservation** — customer selects item and dates; system blocks the slot and the cleaning-buffer days afterward (buffer length per Open Item #3). This minimal buffer is in v1; the richer cleaning-queue workflow is v2. 10. **Rental Date Selection** — pickup and return dates. 11. **Fulfillment Choice** — shop pickup or in-shop fitting appointment. (Delivery is v1.1 — see Open Item #7.) A fitting may be booked before reserving; a fitting does **not** hold the rental slot — only a confirmed reservation blocks dates. 12. **Booking Status Tracking** — pending / approved / rejected / picked up / rented / returned / completed / cancelled. Tracked **separately** from payment state (deposit paid / balance due / refunded / forfeited) — the two are orthogonal.

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
- Customer ↔ shop in-app messaging
- Multi-shop / marketplace expansion (shop accounts, payouts, commissions)
- Owner vs. staff role split (if not done in v1)

---

## Out of Scope

- Sale of items (rental only)
- Tailoring / alteration services
- Multi-currency or multi-language (PH market, Filipino + English; PHP only)
- POS / accounting integration

---

## Known Risks

- **Notification reach** — push + email alone may not reliably reach PH customers for time-sensitive alerts. Addressed: SMS ships in v1 for pickup + overdue; extend to other events in v2 if push adoption stays low.
- **Fraud / no-shows** — handing physical items to strangers is high-risk. Phone OTP is decided for v1; still confirm whether ID upload / tiered deposit are needed before launch (Open Item #6).
- **Delivery complexity** — resolved by deferring delivery to v1.1; v1 launches with pickup + fittings only.
- **Marketplace-ready data model** — small upfront cost; pays off only if v2 marketplace actually happens. Don't over-engineer.
