Generate a complete modern mobile app UI design system and screen designs for a gown and costume rental app called "Renta".

Renta is a rental booking app for a single dress shop in Manila. A customer browses gowns and costumes, checks which dates a piece is actually free, reserves a date range, and holds it with an online deposit — then pays the balance in person at pickup. The shop runs the other half from the same app: catalog, approvals, returns, fittings. The whole product is one loop, and the app should state it plainly: **Find → Check dates → Reserve → Pay deposit → Confirmed → Pick up → Return.**

Two people use this app, and both are on a phone. The customer is booking for a wedding, a debut, or a convention — usually once, usually anxious, usually deciding on a mid-range Android device. The shop owner is one person running the floor between customers, who needs to know what is going out today, what is coming back, and who has not paid.

The app helps customers:

- browse gowns and costumes with real photos, sizes, colors and prices
- see exactly which dates a piece is free before travelling to the shop, and which are blocked because it is being cleaned
- choose a pickup and a return date and see what those days cost before committing
- hold the dates with a refundable deposit paid online, with the balance settled at the counter
- book an in-shop fitting without that fitting locking the rental dates
- follow a booking from pending, through confirmed, out now, and completed
- always know what has been paid and what is still due
- show the shop a code at the counter instead of explaining who they are
- see their rental history and receipts afterwards

The app helps the shop:

- see the day at a glance: overdue, today's pickups, today's returns, pending approvals, unpaid balances
- approve, confirm, reject or cancel bookings from one list
- keep the catalog current, including photos and per-size stock
- process a return in three steps and send the piece into its cleaning window so the dates block themselves
- run fitting appointments on their own calendar, separate from rentals

Design style:

- warm, editorial, and unhurried — the visual language of a good fashion house's printed lookbook, translated to a phone
- **light mode only.** A warm ivory ground throughout, never pure white and never cold grey. This is the app's identity, not a theme setting, and there is no dark variant: an ivory-and-bronze product has no honest inversion.
- the garment photography is the only saturated color anywhere on screen, and it is generous — full-bleed on the item detail and the welcome, large in the category tiles and the grid
- an elegant high-contrast serif carries every moment that matters, set large and given room; the interface itself stays in a quiet neutral sans
- wide-tracked uppercase labels used as connective tissue — a printed-page device, applied sparingly
- soft, restrained geometry: generously rounded photo panels and cards, softly rounded rectangles for buttons, true circles only for size chips, calendar days and avatars
- depth comes from warm hairlines and very soft shadow, never from heavy borders or elevation stacks
- generous whitespace and slow pacing — this is a decision people make once
- the admin side uses exactly the same tokens and components at a tighter rhythm; it is denser, never a different product
- NOT gold foil, NOT lace or floral ornament, NOT script lettering, NOT a dense e-commerce grid, NOT a logistics dashboard, NOT pastel-cute
- must be buildable with React Native and Expo on both iOS and Android, with nothing that degrades badly on a mid-range Android device

Color palette — these are the shipped values, not a direction to interpret:

- ground `#F7F3EC` (warm ivory), recessed fills `#EDE7DC`, raised cards and sheets `#FFFDF9`, hairline `#E5DDD0`
- primary text `#1C1A17` (warm near-black), secondary text `#6F675B` (warm taupe, AA on the ivory ground)
- **primary action — antique bronze `#8A6F45`**, pressed `#6F5836`, soft fill `#E8DCC8`. Every primary action: Get started, Continue, Reserve, Pay deposit, Mark as returned, the floating add button. Warm, desaturated, never yellow and never metallic-shiny. It is deliberately deeper than it looks on a mockup so white labels clear AA.
- **second action — charcoal `#1C1A17`**, for the highest-commitment inline action (Check dates), the selected size chip, and the selected calendar range. **Bronze proposes; charcoal commits.**
- six status tokens, each a pale fill with a deeper ink of the same hue, each carrying exactly one meaning everywhere in the app:
  pending `#8A6114` on `#F7E9CE` · confirmed and available `#1F7A45` on `#DCEEE0` · out now `#A2551F` on `#FAE3D2` · in cleaning `#2A6389` on `#D9E7F2` · overdue `#A83232` on `#F8DDDD` · completed and past `#6F675B` on `#EAE6DE`
- status color is never decorative, and no decorative surface ever borrows a status hue — categories and cards carry no color of their own, because the photography already does
- destructive actions (sign out, delete account, cancel booking) use the overdue red as text and icon only, never as a filled button on a customer screen

Typography:

- **display: Playfair Display** — a high-contrast elegant serif, for the wordmark, screen titles, the customer's name, item names, and the one big number on a success screen. Set large, tracked tight, never more than a few words at a time, and never below body size or as a paragraph.
- **interface: Inter** — every label, list row, button, form field, price and body sentence. It should disappear.
- **labels: Inter in wide-tracked uppercase**, small and quiet, for the printed-page moments — the tagline, the cover marks, section eyebrows like UPCOMING PICKUP and BROWSE BY CATEGORY
- true tabular figures everywhere a number appears: peso amounts, dates, day counts, phone numbers, a hold countdown
- an intentionally shallow hierarchy — three or four levels, with the serif doing the work at the top and the sans doing everything else

All money is Philippine pesos with the peso sign, no decimals, grouped thousands. All dates are Manila time, written as "Jun 16, 2025", with the weekday shown wherever a customer has to act on it, and ranges as "Jun 16 – 19, 2025". Use one consistent set of sample data across every screen so the presentation reads as one product: Midnight Muse at ₱1,500 / day with a ₱3,000 refundable deposit, booked Jun 16 – 19, 2025 for 4 days — ₱6,000 rental fee, ₱3,000 paid online, ₱6,000 balance due at pickup, cleaning Jun 20 – 21, fitting Jun 14 at 2:00 PM, booking reference RNT-00123. Supporting pieces: Celeste ₱1,200, Sapphire Dream ₱1,800, Aurora ₱1,200, Crimson Queen, Knight Costume. The customer is Juan Dela Cruz, +63 912 345 6789.

Design system to define up front (before the screens):

- semantic color tokens for background, surface-recessed, surface-raised, hairline, text-primary, text-secondary, accent-bronze, accent-pressed, action-charcoal, and the six status tokens, each with a fill and an ink value
- type scale with sizes, weights, tracking and line heights for the serif, the sans, and the tracked label style
- a 4pt spacing scale and a corner radius scale
- **buttons in four variants, shown together**: Primary (bronze, filled), Secondary (soft bronze, filled), Outline (hairline, transparent), Commit (charcoal, filled)
- **input field** resting and focused, and a **filter chip** in default and selected form, where selected carries a small clear ×
- **status badges** for Pending, Confirmed, Out now, In cleaning, Overdue and Completed, drawn as pale pills with matching ink
- **the availability calendar**, with a defined visual for every day state — available, unavailable, in cleaning, the selected range with rounded endpoints, today as a ring, past days faded — and a permanent legend beneath it
- **the money block**: always these four rows in this order, because customers compare them across screens — rental fee with the day count, refundable deposit, total to pay now, balance due at pickup. Plus a settled two-row variant: total paid, balance at pickup.
- **the payment method row** — GCash, Maya, GrabPay, credit or debit card, each with its real brand mark, a one-line descriptor and a radio
- **the booking card** — thumbnail, item name in the serif, date range, day count, and an optional status badge. Repeated at every step of the flow so the customer sees the same object confirmed back to them.
- further components: segmented control, search field with clear action, size chip row, color swatch row, product card with a save affordance, list row with thumbnail, disclosure row, stat card, selection card with a radio, a three-stage progress indicator, bottom sheet, confirmation sheet, toast, skeleton loader, empty state, offline banner, floating add button, and a scannable code block for pickup
- **a signature element — the rental band.** One continuous horizontal strip showing a rental as a span of time rather than a checkout. A solid bronze segment across the rental days with filled markers at pickup and return; a lighter dotted tail for the cleaning days, which are blocked but not booked; a hairline for today; and a hollow marker drawn OFF the band entirely for a fitting, because a fitting does not hold the item. Label the dates beneath the markers. Present it with its own legend — rental period, cleaning (blocked), today, fitting (separate) — and design it small and unlabelled for list rows, medium for a booking card, and full width with dates for the booking summary and detail.
- a rule the design must express visually: **booking status and payment status are two different things and never merge into one badge.** A booking can be confirmed and still owe money; it can be pending with nothing paid at all. Status lives in the badge and the band; money always sits next to an amount.
- **customer tab bar: Home, Bookings, Profile** — three tabs, line icons with labels, no center action button
- **admin tab bar: Dashboard, Bookings, Items, More** — four tabs, same construction
- icon style: single-weight rounded line icons from one family throughout — home, calendar, search, heart, user, clock, credit card, chevron — never filled, never mixed weights

Screens to design, numbered and labelled exactly as listed:

**Entry and account**

1. **Splash** — the wordmark in the serif on ivory with the tracked tagline beneath. No spinner.
2. **Welcome** — a full-bleed garment photograph, a serif headline over it, a bronze "Get started" and a quiet "I already have an account".
3. **Sign up** — full name, email, password with a reveal toggle, phone number, and terms acceptance as a real checkbox with linked documents.
4. **Phone verification** — six large single-digit boxes, the number it was sent to, and a resend countdown.
5. **Log in**, and a forgot-password flow. Plus Terms and Privacy as readable in-app documents.

**Browse and discover**

6. **Browse home** — "Good morning," in the sans above the customer's first name in the serif, a notification bell, a search field, a Women / Men segmented toggle, and a two-by-two grid of photographic category tiles: Gowns, Costumes, Shoes, Accessories.
7. **Search results** — the query in the field with a clear action, a result count and a Filter button, then a two-column grid of product cards, each a photo with a save affordance in the corner, the name, and the per-day price.
8. **Item detail** — full-bleed photo carousel with a page indicator; a card overlapping the photo carrying the item name in the serif, the per-day rate, and the refundable deposit called out separately; a size chip row with the selected size filled charcoal; a color swatch row; and a sticky bottom bar showing the rate plus deposit beside a charcoal "Check dates".
9. **Filter sheet, empty search, loading skeletons, and an error state with retry.**

**Dates and booking — the half of the product that exists nowhere else**

10. **Availability** — a month grid with arrows, days drawn in the status ramp, and a permanent legend: Available, Unavailable, In cleaning, Selected range, Today. A bronze "Continue" that states the number of days chosen.
11. **Date range** — the chosen span confirmed back as "Jun 16, 2025 → Jun 19, 2025", the day count, the rental band, the rental fee for those days, and a green note that the dates are available with the next available date after this booking.
12. **Fulfillment** — "How will you get it?" with two selection cards: shop pickup, and a fitting appointment whose description says plainly that it does not reserve the rental dates. Delivery does not exist in this version and must not appear, not even disabled.
13. **Fitting (optional)** — "Book a fitting" over the line "This does not hold the rental dates.", a day picker that is visibly a different object from the rental calendar, and time-slot chips (10:00 AM, 11:30 AM, 1:00 PM, 2:30 PM, 4:00 PM).
14. **Booking summary** — the booking card, the rental band at full width, the fitting appointment with an Edit affordance, the four-row money block, and one plain sentence naming the cleaning dates and why they are blocked. The action names the amount: "Reserve with ₱3,000".
15. **Held slot** — the dates are held while payment completes. A calm strip with the remaining time, the booking card, and "Pay now". Design the expired state too: it offers to check the dates again and never blames the customer.
16. **Payment method** — one row per method with its real brand mark, a radio, a lock icon with "Payments are secure and encrypted.", and a bronze button naming the amount.
17. **Processing** — a single icon, "Completing your payment", a line telling the customer not to close the app, and a three-stage indicator: Connecting, Processing, Finalizing. This is the highest-anxiety moment in the app and must not look broken. Design the failure state as well: what happened, and one clear way forward.
18. **Payment success** — a green confirmation mark, "Payment successful!", the amount large in the serif, "Your dates are confirmed.", the booking card, and a plain line stating what will be paid at the shop. Two actions: View booking, View receipt.
19. **Booking confirmed** — "You're all set!", "A confirmation has been sent to your email.", the booking card, total paid and balance at pickup, and "View my bookings".

**After booking**

20. **My bookings** — the title in the serif with a bell, Upcoming and Past tabs, then sections grouped by what the customer has to do next: Upcoming pickup, Returning soon, Past bookings. Each row carries a thumbnail, a status badge, the date range, a small rental band, the fitting if there is one, and any balance due.
21. **Booking detail** — the booking card with its status badge, the full-width rental band, total paid and balance at pickup, then disclosure rows for Rental details, Fitting appointment, Payment details and Cancellation terms, with Cancel booking as a quiet red row and a confirmation sheet.
22. **At pickup** — "Ready for pickup" over "Show this to our staff.", a scannable code, the booking reference, the booking card, and the amount due at the counter in the pending tint.
23. **After return** — a green mark, "Thank you!", "We hope you had a great time. See you on your next occasion.", the booking card, and two actions: Book again, View receipt.
24. **Notifications inbox** grouped by day, and **Profile** — avatar with the customer's initial, name in the serif, phone beneath, then disclosure rows for My details, Rental history, Notification preferences and Help & support, with Sign out and Delete account as red rows.

**Admin — same tokens, denser posture**

25. **Dashboard** — the wordmark with an Admin chip, the date and a greeting, then five stat cards: Overdue, Today's pickups, Today's returns, Pending approvals, Unpaid balances. Overdue is the only card allowed the red tint; on a day when nothing is wrong the screen reads almost colorless.
26. **Bookings management** — filter chips for All, Pending, Confirmed and Out now, then rows with a thumbnail, the customer's name, the date range, the amount and a status badge. The detail approves, rejects or cancels; rejecting requires a reason, because that reason becomes customer-facing text.
27. **Item management and the item editor** — a searchable list with filter chips and stock state per row, then the editor: fields, per-unit sizes and statuses, and multi-photo upload with reorder and delete. A bronze floating add button.
28. **Categories management.**
29. **Returns** — "Process return" over the booking being closed, then three numbered steps: confirm the item is returned, set the cleaning period with its dates, set the item condition. Completed steps carry a green check; the button is "Mark as returned".
30. **Fittings calendar** — a horizontal week strip with the selected day filled charcoal, then time-stamped appointment rows with the customer, the fitting type and a status badge.
31. **Availability (admin view)** — the same calendar component showing all six inventory states, because the admin needs the diagnosis the customer was spared.
32. **Payments, customers, and the audit log** — dense list rows, one action per row, filters as chips. The audit log is read-only and dated to Manila.

**System states to design once and reuse**

33. Skeleton loaders matching the real layout for the grid, the calendar and the bookings list; empty states that name the next action; an offline banner, because connectivity is genuinely unreliable for this audience; a generic error with retry; a success toast; and a destructive confirmation sheet.

Voice: plain English with the cadence of ordinary Manila speech, sentence case, specific, and never contractual. Use these as the reference register — "Find the perfect look for your special moment.", "Find your look. Check the dates. Reserve with a deposit. Wear your moment.", "This does not hold the rental dates.", "The item will be in cleaning from Jun 20 – 21. These dates are blocked for other customers.", "You'll pay ₱6,000 at the shop when you pick up.", "Please do not close the app. This will only take a moment.", "Show this to our staff.", "A confirmation has been sent to your email.", "We hope you had a great time. See you on your next occasion." An action keeps its name through the whole flow. Errors say what happened and what to do, and never apologize. The refundable deposit is labelled refundable every single time it appears.

Accessibility is part of the design. Text meets AA against the ivory ground — the taupe secondary must be dark enough to qualify, not merely look soft, and the bronze must be deep enough for white labels to clear it. Status is always carried by a word as well as a color, so the cleaning days on the rental band differ by texture and not only hue. Tap targets are at least 44pt. The design must survive the largest system font size. Motion is minimal and respects reduced-motion.

Explicitly do NOT design: delivery or couriers, damage reporting with photos, automatically calculated penalties, a cleaning queue beyond the blocked dates, reports or analytics charts, reviews and ratings, wishlists beyond the save affordance, promo codes and loyalty, in-app messaging, multiple shops or a marketplace, buying items outright, alterations, currency or language switching, and any web or tablet layout.

Deliver it as a single presentation sheet, composed like a studio case study:

- a cover band across the top: the wordmark large in the serif with its tracked tagline; a serif headline and one line summarising the loop; the seven-step journey as a numbered strip — Find, Check Dates, Reserve, Pay Deposit, Confirmed, Pick Up, Return; a full-bleed garment photograph to the right with a short tracked mark over it
- the screens below in labelled, numbered rows, rendered as realistic iPhone frames with honest status bars, safe areas and home indicators
- a UI components panel showing the four button variants, the input field, the filter chip in both states, and all six status badges together
- a dedicated panel for the rental band, drawn large with its dates and full legend, plus the detached fitting marker shown separately and labelled
- an icon style panel
- a footer with a closing serif line, the wordmark, the shop's city, and the three-word mark RENT. CELEBRATE. RETURN.

Nothing may depend on an iOS-only affordance, because most of these customers are on Android. Every screen must share the same tokens, spacing and components — one design system, not thirty pretty pictures. Prioritize the two paths that are the product: a customer finding a piece that is free on their date and holding it with a deposit, and a shop owner opening the app to see what today requires.

The UI should feel: warm, composed, expensive without being cold, and completely trustworthy with someone's dates and someone's money.
