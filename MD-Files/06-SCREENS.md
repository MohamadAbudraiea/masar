# 06 — Screens

Routes, purpose, content, data source (`04`), and actions for every screen. Components are named as in `05`. Every list screen uses `FilterBar` + `DataTable` with URL state, and has loading, empty, and error states.

## 1. Public

### 1.1 Landing page `/`
Bilingual (EN/AR), all copy in i18n. Header: logo, language toggle, **Log in**, **Sign up**. Sample numbers and testimonials live in `client/src/pages/public/landingContent.js` so the owner can edit them.

**Hero (the one memorable moment).** Navy full-width band. Left: headline, sub-line, two buttons. Right/below: an animated **dotted amber route** from a factory pin to a destination pin. On load the white truck drives along the dots once, and six stations light up in turn with small status labels and demo timestamps (Requested → Paid → Accepted → Loaded → Delivered → Confirmed). Respect reduced motion (show the finished state).
- EN H1: "Every shipment, tracked from the factory gate to the receiver."
- EN sub: "Masar connects manufacturers with verified drivers and holds the payment in escrow until you confirm the delivery."
- Buttons: **Ship with Masar** (amber, → `/signup/manufacturer`), **Drive with Masar** (outlined, → `/signup/driver`).
- AR H1: "كل شحنة، من بوابة المصنع حتى المستلم، تحت المتابعة."
- AR sub: "مسار يربط المصانع بسائقين موثّقين، ويحتفظ بالمبلغ في حساب ضمان حتى تؤكد التسليم."
- AR buttons: "اشحن مع مسار" / "اعمل سائقًا مع مسار".

**Sections (in order)**
1. **How it works.** The same six stations as a sequence, with one plain line each.
   EN: You post the shipment · Your payment is held safely · A matching driver accepts · The goods are loaded · The driver delivers · You confirm, and the driver is paid.
   AR: تطلب الشحنة · يُحفظ دفعك بأمان · يقبل الشحنة سائق مناسب · تُحمَّل البضاعة · يسلّم السائق الشحنة · تؤكد التسليم، ويُصرف مستحق السائق.
2. **For manufacturers.** Post a shipment in minutes. Choose the truck from a guided list. Follow every step live on a timeline. Pay only after you confirm. Layout: text left, a static screenshot-style mock of the shipment detail (built as real components with sample data) right.
3. **For drivers.** Shipments that fit your truck. You see what you will earn before you accept. A simple app made for long days on the road. Layout: text right, the **driver app in the phone frame** showing an available-shipment card.
4. **Your money is protected.** Explain escrow in three plain lines (paid in → held → released after confirmation). No commission numbers anywhere public.
5. **Trucks we cover.** Four categories (Light up to 2.5 t, Medium to 7.5 t, Heavy beyond, Tankers) with example bodies (refrigerated, curtain-side, tipper, tankers, containers).
6. **Trust strip.** Sample counts (shipments delivered, drivers, manufacturers), average rating stars, two or three short testimonials.
7. **Final call to action** with the two buttons again. **Footer:** logo, contact (`SUPPORT_EMAIL`), language, links to Log in and Sign up.

### 1.2 Login `/login`
One form: email or phone + password, **Log in** button, link to Sign up. Heading mentions all roles ("Log in as a manufacturer, driver, or admin"). If `VITE_SHOW_DEMO_ACCOUNTS=true`, show a collapsible "Demo accounts" panel with tap-to-fill chips per role. After login, redirect to `?redirect=` if present, else the role's home. `status = pending|rejected` → `/pending-approval` (shows "We're reviewing your documents" or the rejection reason, plus Log out).

### 1.3 Sign up `/signup`
Two large choices: "I'm a manufacturer" → `/signup/manufacturer`, "I'm a driver" → `/signup/driver`.

### 1.4 Manufacturer signup `/signup/manufacturer`
Multi-step with progress:
1. **Company:** name (single language), contact person (optional), password.
2. **Contacts:** one or more phones (with country code), one or more emails. Add/remove rows.
3. **Location:** map + search + paste-link (reuse `LocationPicker`), label, shows `city, area`.
4. **Goods categories:** at least one, as selectable chips (EN/AR names).
5. **Documents:** Commercial registration (PDF), Professions license (PDF).
Submit → "Thanks, we're reviewing your documents" screen.

### 1.5 Driver signup `/signup/driver`
1. **Details:** name, phone (with country code), optional email, password, **scope** (Internal only / External, can also do internal), **license class** (4, 5, 6).
2. **Documents (PDF):** ID, driving license, passport (only if External).
3. **Truck:** `TruckSelector` cascade, plate number, ADR certified toggle, **truck license (PDF)**, **1–3 truck photos (images)**.
4. **Payout:** IBAN (required), CliQ alias (optional).
Submit → pending screen.

### 1.6 Email link resolver `/open?to=<path>&as=<userId>`
Logged out → `/login?redirect=<to>`. Logged in as someone else → "This link is for another account" page with a **Switch account** button (logs out, then login with redirect). Otherwise navigate to `to`.

## 2. Manufacturer dashboard `/manufacturer/*`
Sidebar: Overview · Shipments · New shipment (button) · Payments · My drivers · Locations · Profile · Settings.

### 2.1 Overview `/manufacturer`
`GET /reports/manufacturer/overview`, date range filter on top.
- **Needs your action** strip: unpaid shipments ("Pay now"), goods to mark as loaded, deliveries to confirm. Each count links to the filtered list. Hidden when all zero (show a calm "You're all caught up").
- KPI row: Total shipments, Active, Total paid, Held in escrow, Released, Awaiting payment (all **price only**).
- Charts: spending over time, shipments by status (donut), by goods category (bar), top drivers.
- Recent shipments table (compact timeline dots).

### 2.2 Shipments `/manufacturer/shipments`
Status tabs (All, Awaiting payment, Open, In progress, Delivered, Confirmed) + `FilterBar` (date range, exact date, number search, goods category, driver, city). Columns: number, route (city → city), pickup time, driver (link), price, status chip, compact timeline. Row click → detail. Export CSV.

### 2.3 New shipment `/manufacturer/shipments/new` and edit `/…/:id/edit`
One page, sections down the left with a sticky summary on the right (route preview map, price, **Create** and **Create and pay** buttons). No commission breakdown anywhere.
1. **Pickup:** `LocationPicker` (saved first), date, time, toggles *Needs loading*, *Needs unloading*.
2. **Destination:** `LocationPicker` (remembers name and phone), destination name, destination phone (with country code).
3. **Cargo:** goods category (only registered ones), description, quantity (unit follows the suggested truck), trip type (local / international; international shows destination country and locks the customs section on).
4. **Truck:** suggested category + body (+ cooling) preselected with the reason ("Suggested for 4 t of chilled goods"); change with selects.
5. **Conditional fields** appear per `01` §6 (temperature range, ADR class + safety certificate, liquid type, dimensions, customs toggle with declaration number, permit type, details, optional PDF).
6. **Price** (min 500 JD) and **Notes**.
Edit is only reachable while `requested`.

### 2.4 Shipment detail `/manufacturer/shipments/:id`
- Header: number, status chip, price, primary **action panel** for the current status: **Pay now** (requested), **Goods loaded** (waiting_load), **Confirm delivery** (delivered, highlighted), **Rate Mr. {name}** (audited), plus **Edit**/**Delete** while requested and **Download PDF** when audited.
- Full-width **Timeline** with timestamps and early/late marker.
- Two-column body: Pickup (address, MapLink, time, needs loading), Destination (address, MapLink, name, `PhoneLink`), Cargo and required truck, Conditional fields, Customs, Notes.
- **Driver card** once accepted: name (link to driver profile), `PhoneLink`, rating, truck type, plate, photos.
- Map with the route.
- Rating panel after `audited`.
"Pay now" opens a convincing **fake payment sheet** (card or bank transfer tabs, amount, a short success animation), then the status becomes Pending.

### 2.5 Payments `/manufacturer/payments`
KPIs (Paid, Held in escrow, Released, Awaiting payment) and a table: shipment, price, status, paid at, released at, driver. Filters and CSV.

### 2.6 My drivers `/manufacturer/drivers` and profile `/manufacturer/drivers/:id`
List of drivers on his shipments: name, rating, truck, times worked with him (his own count only). Profile: photo gallery, name, phone, rating and reviews (reviewer names plain text), truck and plate, **completed shipments** list per the privacy rule in `01` §11, and his own shipments with this driver (linked).

### 2.7 Locations `/manufacturer/locations`
Tabs Pickup / Destinations. Map + list, add (same picker), edit label, set default, delete.

### 2.8 Profile `/manufacturer/profile`
Company info, contacts, goods categories (add or remove instantly), ratings received with reviews, read-only documents (PDF viewer).

### 2.9 Settings `/manufacturer/settings` (shared `Settings` page)
Profile fields, password, language, time zone, **email notifications toggle**, everything except documents.

## 3. Driver app `/driver/*` (PhoneFrame on desktop)
Header shows "Mr. {name}" and the notification bell. Four bottom tabs.

### 3.1 Shipments `/driver`
Top banner if he has an active shipment ("You have an active shipment" → `/driver/active`). Filter chips: Nearest pickup, Highest earnings, city select. Cards per `05` §8. Empty: "No open shipments match your truck right now. New ones appear here." Tap card → detail.

### 3.2 Shipment detail `/driver/shipments/:id`
Limited view if `pending`, full view once assigned (`01` §12). Big **Accept shipment** (green). Busy → disabled with "Finish your active shipment first". Sheet: "Accept this shipment? You'll earn 752.000 JD." → **Yes, accept** / **Not now**. After success the screen becomes the active view. If someone else took it: toast "Shipment already taken" and return to the list.

### 3.3 My shipment `/driver/active`
Giant card: route cities, vertical large `Timeline`, tappable pickup and destination (**Open in Google Maps**), **Call** buttons for the manufacturer and the receiver, requirement badges ("You load the goods", "You unload at destination"), notes, customs info, **Your earnings**. One giant action button for the next step: **I've arrived at pickup** (then stays visible as "Arrived 09:05 (25 min early)"), then waiting for the manufacturer to mark loaded, then **Delivered** (with confirmation sheet). After `delivered`: "Waiting for the manufacturer to confirm. You're free to take a new shipment" with a button to the list. Empty state when none.

### 3.4 Earnings `/driver/earnings`
KPIs: Pending release, Paid out, This month, Completed. Date range filter. Payout list (shipment, earnings, date), and the payout account (IBAN, CliQ).

### 3.5 Me `/driver/me`
Rating and reviews (reviewer names plain text), truck card (type, plate, photos), documents (read-only), **History** `/driver/history` (completed shipments with date filters and number search), Settings, Log out.

### 3.6 Manufacturer profile `/driver/manufacturers/:id`
Only for manufacturers of his accepted shipments: name, rating, reviews, location (MapLink), phone (`PhoneLink`).

### 3.7 Notifications `/driver/notifications`
Large list, tap to open.

## 4. Escrow dashboard `/escrow/*`
Sidebar: Overview · Held funds · Releases · Companies · Drivers · Shipments · Settings. Account: SafePay Escrow (prefilled).

- **Overview `/escrow`:** KPIs (Funds held, Released in period, Commission earned, Awaiting release), charts: held vs released over time, commission over time. Date range filter.
- **Held funds `/escrow/held`:** row per company and shipment: company (link), shipment (link), amount, held since, status. Row actions: **View shipment**, **View company**. Filters and CSV.
- **Releases `/escrow/releases`:** ledger of payouts: shipment, release time, price, escrow commission, Masar commission, driver net, the driver's **IBAN and CliQ**, status "Transferred".
- **Companies `/escrow/companies`, profile `/escrow/companies/:id`:** list with totals; profile has financial statistics with a date range (deposited, held, released, shipments count), contact info, and **all its shipments** (filterable table, driver links to `/escrow/drivers/:id`).
- **Drivers `/escrow/drivers`, profile `/escrow/drivers/:id`:** payout account, payout statistics with date range, all his shipments (company links).
- **Shipments `/escrow/shipments`, detail `/escrow/shipments/:id`:** financial view: full breakdown, ledger entries, timeline, parties (links).

## 5. Admin dashboard `/admin/*`
Sidebar: Overview · Approvals (with count badge) · Manufacturers · Drivers · Shipments · Financial · Ratings · Settings.

### 5.1 Overview `/admin`
- KPI row: Users, Active shipments, Pending approvals, Masar revenue, Volume. (A **Cancel rate** card is reserved but hidden until cancellations exist.)
- **Live map** (Leaflet): pins for `pending` (grey), `waiting_load` (amber), `in_delivery` (white **truck icon moving along the route**, a simulated demo animation with a small "Simulated movement" label). Click a pin for a popup with a link.
- **Activity feed:** live stream (auto-refresh 10 s) of events like "Mr. Omar accepted MSR-000124", "Payment received", with relative time and links.
- Newest 5 requested, newest 5 pending, newest 5 audited shipments.
- Top-rated manufacturers and drivers, top manufacturers and drivers by number of shipments.
- Shipments by status chart.

### 5.2 Approvals `/admin/approvals`
Tabs Manufacturers / Drivers. Queue rows with submitted date. Click opens a side panel with all data and an inline `PdfViewer` for each document and truck photos. **Approve** or **Reject** (reason required).

### 5.3 Manufacturers `/admin/manufacturers`, new `/admin/manufacturers/new`, profile `/admin/manufacturers/:id`
List with search, rating, shipments count. **Add manufacturer** uses the signup form fields (auto-approved). Profile: info, documents, locations, goods categories, shipments (linked to drivers), ratings, edit, **Reset password**.

### 5.4 Drivers `/admin/drivers`, new, profile
Same pattern. Profile includes truck (editable by admin), photos, documents, payout account, shipments (linked to manufacturers), ratings, reset password.

### 5.5 Shipments `/admin/shipments`, detail `/admin/shipments/:id`
All shipments with every filter. Detail shows the full money breakdown, documents, ledger entries, timeline, and **Download PDF** (admin version).

### 5.6 Financial `/admin/financial`
Group by day/week/month, date range. KPIs: Masar income, escrow commissions, total volume, held, released. Charts: income over time, income by manufacturer, by driver. Tables with CSV export.

### 5.7 Ratings `/admin/ratings`
All ratings with filters (stars, date, from/to party) and links.

## 6. Shared pages
- **Notifications** `/<role>/notifications`: full list, mark all read.
- **Settings** `/<role>/settings` (admin and escrow: password, language, time zone, email toggle).
- **404** page.

## 7. Route table (summary)
| Role | Home | Shipment detail | Profiles |
|---|---|---|---|
| manufacturer | `/manufacturer` | `/manufacturer/shipments/:id` | `/manufacturer/drivers/:id` |
| driver | `/driver` | `/driver/shipments/:id` | `/driver/manufacturers/:id` |
| escrow | `/escrow` | `/escrow/shipments/:id` | `/escrow/companies/:id`, `/escrow/drivers/:id` |
| admin | `/admin` | `/admin/shipments/:id` | `/admin/manufacturers/:id`, `/admin/drivers/:id` |

`TicketDetail`, `ManufacturerProfile`, and `DriverProfile` are shared components rendered under each role's route with role-specific props (panels shown, links built by `linkTo`).
