# 09 — Demo Data and Demo Script

`npm run db:seed` wipes every table, reloads reference data (`03` §3–4), then loads the demo data below. It must be **repeatable** and **deterministic** (use a seeded PRNG). Seed through the same service functions where practical (money split, matching), but write `status_history` timestamps directly so history looks real.

## 1. Accounts
Password for every demo account: **`Masar@123`** (store the bcrypt hash). Phones are fictional, with country code. Show them as tap-to-fill chips on the login page when `VITE_SHOW_DEMO_ACCOUNTS=true`.

| Role | Name | Login | Notes |
|---|---|---|---|
| admin | Lina Qasem (Masar Admin) | `DEMO_ADMIN_EMAIL` | Real inbox |
| escrow | SafePay Escrow | `DEMO_ESCROW_EMAIL` | Real inbox |
| manufacturer | **Al-Nour Foods Co.** (Khaled Haddad) | `khaled@alnour.demo`, +962790000001 | Zarqa. Categories: Dry, Chilled, Frozen. **Demo hero** |
| manufacturer | Petra Dairy Industries | `ops@petradairy.demo`, +962790000002 | Amman (Marka). Chilled, Frozen, Liquid |
| manufacturer | Jordan Steel Works | `sales@josteel.demo`, +962790000003 | Sahab, Amman. Machinery, Bulk, Dry |
| manufacturer | Aqaba Chemicals Ltd. | `dispatch@aqabachem.demo`, +962790000004 | Aqaba. Hazardous, Liquid, Bulk |
| manufacturer | Madaba Furniture House | `info@madabafurn.demo`, +962790000005 | Madaba. Furniture, Dry |
| manufacturer | Mafraq Agri & Livestock | `office@mafraqagri.demo`, +962790000006 | Mafraq. Livestock, Bulk, Dry |
| manufacturer (**pending**) | Jerash Olive Oil Co. | `info@jerasholive.demo` | Awaiting approval, for the approvals demo |
| driver (**pending**) | Majed Rawashdeh | +962790019999 | Awaiting approval |

Each manufacturer has 2–3 saved pickup locations (the first is the default) and 3–5 saved destinations with receiver name and phone.

### Drivers (phone `+9627900100NN`, NN = number)
| # | Mr. | Scope | License | Truck (category / type / body) | Payload max | Extras |
|---|---|---|---|---|---|---|
| 1 | **Omar Saleh** | internal | 4 | medium / long_chassis / refrigerated (chilled) | 4 t | **Demo hero, free**, rating ≈4.8 |
| 2 | **Ali Mansour** | internal | 4 | medium / long_chassis / refrigerated (chilled) | 4 t | **Busy** (has a `waiting_load` shipment) |
| 3 | Yousef Nasser | internal | 4 | medium / short_chassis / refrigerated (chilled) | 3 t | Too small for the hero shipment |
| 4 | Mahmoud Qudah | internal | 5 | heavy / rigid / closed_box (3 axles, 27 t gross) | 18 t | |
| 5 | Hasan Tarawneh | external | 6 | heavy / tractor_trailer / flatbed | 32 t | Passport doc |
| 6 | Ibrahim Al-Zoubi | external | 6 | heavy / tractor_trailer / refrigerated (frozen) | 26 t | Passport doc |
| 7 | Sami Khalil | external | 5 | tanker / chemical_tanker | 30,000 L | **ADR certified**, passport doc |
| 8 | Tariq Abu Hassan | internal | 4 | light / van / closed_box | 1 t | |
| 9 | Nabil Odeh | internal | 5 | tanker / fuel_tanker | 40,000 L | |
| 10 | Fares Haddadin | internal | 4 | medium / long_chassis / closed_box | 5 t | |
| 11 | Rami Shaheen | internal | 5 | heavy / rigid / tipper (4 axles, 35 t gross) | 25 t | |
| 12 | Waleed Masri | internal | 5 | heavy / rigid / livestock (3 axles) | 14 t | |

Every driver has: IBAN (fake `JO94CBJO0010000000000131000NNN`), CliQ alias for about half, placeholder PDFs for documents (generate small valid PDFs with `pdfkit` and upload them to R2), and 1–3 truck photos (bundle 6 royalty-free-looking placeholder truck images in `server/db/seed/assets/` and upload them).

### Locations (lat, lng, city, area)
| Place | Lat | Lng | City | Area |
|---|---|---|---|---|
| Al-Nour factory | 32.0728 | 36.0880 | Zarqa | Hashemiyya Industrial |
| Petra Dairy plant | 31.9700 | 35.9900 | Amman | Marka |
| Jordan Steel yard | 31.8670 | 36.0030 | Amman | Sahab Industrial |
| Aqaba Chemicals plant | 29.5320 | 35.0063 | Aqaba | South Coast Industrial |
| Madaba showroom | 31.7160 | 35.7939 | Madaba | Madaba Center |
| Mafraq farm depot | 32.3406 | 36.2080 | Mafraq | Mafraq Plains |
| Fresh Market | 32.5556 | 35.8469 | Irbid | Al-Hashmi |
| Receivers (variety) | | | Amman (Abdoun 31.9454,35.8830), Salt (32.0392,35.7272), Jerash (32.2808,35.8993), Karak (31.1853,35.7048), Ma'an (30.1962,35.7341), Irbid, Aqaba, Madaba | |
| Riyadh warehouse (international) | 24.7136 | 46.6753 | Riyadh | Al-Sulay |

Receiver names: Fadi (Fresh Market), Nadia Qawasmi, Bilal Al-Majali, Hana Khasawneh, Zaid Trading, Karak Supermarkets, etc.; phones in full international format.

## 2. Shipments
Create **45 shipments numbered `MSR-000079` … `MSR-000123`**, then `SELECT setval('ticket_seq', 123)` so the first live shipment in the demo is **`MSR-000124`**.

| Status | Count | Notes |
|---|---|---|
| `requested` | 3 | Unpaid. Al-Nour has 1 (to demonstrate Pay/Edit/Delete), two others elsewhere |
| `pending` | 6 | Pickup within the next 36 hours so drivers see them (see list below) |
| `waiting_load` | 3 | One is **Ali Mansour's** (Al-Nour, chilled 3 t). One has an `arrived_at_pickup` event |
| `in_delivery` | 3 | `in_delivery_at` within the last 1–3 hours so the admin-map trucks are moving |
| `delivered` | 3 | Awaiting the manufacturer's confirmation (one belongs to Al-Nour so the "Confirm delivery" alert shows) |
| `audited` | 27 | Spread over the last **90 days**, with ledger entries and ratings |

**The six `pending` shipments**
1. Al-Nour: chilled, 3 t, Zarqa → Irbid (Fresh Market), medium refrigerated, 650 JD, loading and unloading needed.
2. Petra Dairy: chilled, 10 t, Amman → Aqaba, heavy refrigerated, 1,850 JD.
3. Jordan Steel: machinery, 20 t, Sahab → Aqaba, heavy flatbed, 2,400 JD, dimensions 12 × 3 × 3 m.
4. Aqaba Chemicals: hazardous, liquid, 15,000 L, Aqaba → Amman, tanker chemical_tanker, ADR class 3, safety certificate PDF, 1,300 JD.
5. Madaba Furniture: furniture, 2.5 t, Madaba → Amman (Abdoun), medium closed box, 520 JD.
6. Petra Dairy: frozen, 18 t, Amman → Riyadh, **international**, heavy refrigerated frozen, customs declaration `CD-2026-48821`, permit "export", 3,900 JD (external drivers only).

**Generating the 27 audited shipments** (seeded PRNG):
- Pick a manufacturer, a goods category they carry, a quantity within a body's payload range, a compatible driver using the real matching predicate (`01` §8), random pickup and destination from the tables above.
- Price 500–4,500 JD (weighted toward 500–1,500), split via `computeSplit`.
- `status_history`: realistic gaps (requested → paid 5–60 min; accepted 1–12 h; loaded 30–120 min after pickup; delivered 2–8 h; audited 2–30 h). Times between 06:00 and 20:00 Amman.
- `arrived_at_pickup` events for ~80%, with deltas from −30 to +45 minutes.
- Ledger: one `deposit`, then `payout_driver`, `commission_masar`, `commission_escrow` at the audited time.
- Ratings for ~85%: manufacturer → driver (mostly 4–5, a few 3), driver → manufacturer (mostly 4–5). Use comment pools, e.g. for drivers: "On time and careful with the goods.", "Professional and kept us updated.", "Arrived a little late but delivered safely."; for manufacturers: "Goods were ready and loading was quick.", "Clear instructions and fast confirmation.".
- Ensure **Omar Saleh** has about 9 audited shipments (rating ≈ 4.8), all other drivers 1–5 each, and all six manufacturers have several, so every top-N list and chart has data.

Notifications and `activity_log` rows are generated for the last 14 days of events so the admin feed and bells are populated. Mark most notifications read, leaving 2–4 unread per demo account.

## 3. Demo script (about 10 minutes)
**Devices:** A laptop (manufacturer), B phone or a narrow browser window (driver, shown in the phone frame), C laptop (escrow), D laptop (admin). Log in on all four before starting. Rehearsal tip: set `EMAIL_REDIRECT_TO` to your own inbox.

**Before:** `npm run db:seed`. Make sure the pickup of the live shipment is within `DRIVER_VISIBILITY_WINDOW_HOURS` (default 48 h): pick "tomorrow 09:00".

1. **Admin (D) opens the overview.** Show KPIs, the live map with moving trucks, the activity feed, top lists. Open Approvals and approve "Jerash Olive Oil Co." to show documents and the approval flow (optional, 1 minute).
2. **Manufacturer (A) creates MSR-000124.** Al-Nour, **New shipment**: pickup = saved Zarqa factory, tomorrow 09:00, needs loading and unloading; destination = Fresh Market, Irbid (receiver Fadi); chilled, **4 t**; the system suggests *Medium · Refrigerated · Chilled* (explain the suggestion), temperature 2–6 °C; price **800 JD**. Click **Create and pay** → fake payment sheet → success. Status becomes *Open for drivers*. (Manufacturer sees only the price. No commission shown.)
3. **Escrow (C)** refreshes: *Held funds* now shows 800.000 JD from Al-Nour for MSR-000124, with **View shipment** and **View company** buttons. Open the company profile to show statistics, date range, and all its shipments.
4. **Driver Omar (B)** gets the in-app notification (and an email). Shipments tab shows the card: Zarqa → Irbid, distance, pickup time, badges "You load" and "You unload", **Your earnings 752.000 JD**. Open it, point out: no exact address or manufacturer yet. **Ali Mansour** is busy: switch (or mention) that his Accept button is disabled with "Finish your active shipment first". **Yousef** does not see this shipment at all (truck too small).
5. **Omar accepts.** Sheet → **Yes, accept**. Screen becomes **My shipment**: addresses, tap to open Google Maps, call the manufacturer, requirement badges. Manufacturer (A) is notified; open the **driver card** and then the **driver profile** (rating, truck photos, completed shipments with other companies' names as plain text).
6. **Next day, 08:35 (simulate by acting early):** Omar taps **I've arrived at pickup**. The timeline on A shows "Arrived X min early/late".
7. **Manufacturer (A)** taps **Goods loaded** → *In delivery*. The truck slides along the timeline. On the admin map (D) a truck for MSR-000124 begins moving ("Simulated movement").
8. **Omar** taps **Delivered** (confirm sheet). He is free again; his earnings show *Pending release*. Manufacturer gets "Delivered, please confirm".
9. **Manufacturer** "phones the receiver" (tap the `tel:` link), then **Confirm delivery**. Instantly:
   - Omar (B): "752.000 JD transferred successfully to your account …" (in-app + email).
   - Escrow (C): the release record with the full breakdown (escrow 16.000, Masar 32.000, driver 752.000) and Omar's IBAN.
   - Admin (D): feed entry, Masar revenue +32.000, financial dashboard updates.
10. **Ratings:** Khaled rates Omar 5★ with a comment; Omar rates Khaled 4★. Show it on both profiles.
11. **Extras (pick by audience):**
    - Switch the UI to **Arabic** (RTL) on the driver device; show "السيد عمر".
    - In Settings switch the time zone to **Europe/Berlin** to show the same timestamps converted (for the EU audience).
    - Download the **summary PDF** from A (price only) and from D (full breakdown).
    - Use the global search to jump to `MSR-000124`, then ticket → manufacturer → driver → back, back, back.
    - Show filters: date range, exact date, and CSV export on any table.

## 4. Pre-demo checklist
- [ ] `npm run db:seed` run on the demo database; ticket sequence at 123.
- [ ] Resend domain verified; `EMAIL_REDIRECT_TO` unset for the real demo, set for rehearsal.
- [ ] R2 bucket reachable; sample PDFs open in the viewer.
- [ ] Frontend `VITE_API_URL` points to the HTTPS backend.
- [ ] Browsers logged in on all four devices with the right accounts.
- [ ] Driver device tested on a real phone (large text, bottom tabs, tap targets).
- [ ] Arabic and English both walked through once.
- [ ] Time zone resets to Asia/Amman for all demo accounts.
