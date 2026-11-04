# 05 — UI/UX Guide

UI quality is the product. Build to a quality floor without announcing it: responsive, visible keyboard focus, reduced-motion respected, WCAG AA contrast, harmonious colour.

## 1. Brand direction (from the CEO's logo)
The logo is a heavy, rounded, lowercase **masar** wordmark in white on deep navy, with a **dotted amber route line** ending in a small white truck attached to the "r".

**The one memorable idea: the dotted route.** Everything else stays calm and quiet. The dotted-route motif is used for:
1. The **shipment timeline** (the signature component, §7).
2. The landing-page hero animation.
3. Loading states (a truck moving along dots, instead of a spinner).
4. The driver's active-shipment progress bar.
5. The truck marker on the admin map.
6. Favicon (truck + a few dots on navy) and email header.

Avoid the generic traits listed here: identical rounded cards everywhere, soft-grey shadows on everything, gradient washes, ALL-CAPS eyebrow labels, "01 / 02 / 03" numbering unless the content is truly a sequence, arrows appended to every link, one-word-in-colour headlines.

## 2. Tokens
Sample the exact navy and amber from the logo file; these are the starting values.

**Colour**
| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#071E33` | Sidebar, headers, primary text on light |
| `navy-800` | `#0C2B47` | Hover states on navy |
| `navy-700` | `#143B5E` | Active surfaces on navy |
| `navy-100` | `#E3EBF3` | Subtle tints |
| `amber-500` | `#F5A82A` | Primary buttons (navy text on top), route dots, progress |
| `amber-600` | `#E39413` | Amber hover |
| `amber-100` | `#FDF0D5` | Amber tint backgrounds |
| `surface` | `#F4F7FA` | Page background |
| `card` | `#FFFFFF` | Panels |
| `line` | `#DDE5EC` | Borders (prefer borders to shadows) |
| `ink` | `#0F1B2A` | Body text |
| `ink-muted` | `#4A5B6D` | Secondary text (never lighter than this, for 45+ readers) |

**Never use amber as text colour on white** (low contrast). Amber is a fill behind navy text.

**Status colours** (semantic, independent of brand)
| Status | Chip |
|---|---|
| `requested` | slate `#475569` on `#E7ECF1` |
| `pending` | amber-dark `#8A5A00` on `#FDF0D5` |
| `waiting_load` | blue `#1D4ED8` on `#DBEAFE` |
| `in_delivery` | teal `#0F766E` on `#CCFBF1` |
| `delivered` | violet `#6D28D9` on `#EDE9FE` |
| `audited` | green `#15803D` on `#DCFCE7` |
| danger | `#B91C1C` on `#FEE2E2` (reserved for errors and future cancellations) |
Chips always include text, never colour alone.

**Typography**
- Latin: **Plus Jakarta Sans** (weights 400, 500, 600, 700, 800). Headings 700–800 with slightly tight tracking to echo the logo.
- Arabic: **IBM Plex Sans Arabic** (400, 500, 600, 700).
- Numbers use `font-variant-numeric: tabular-nums` in tables and money.
- Scale (desktop): 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48. Body 15–16. Line length under 80 characters. Sentence case everywhere.

**Shape and space**
- 4-px spacing grid. Radius: inputs 8, panels 12, sheets and driver cards 16–20, chips pill.
- Panels use a 1-px `line` border, no shadow. Shadow only for overlays (menus, dialogs, the phone frame).
- Vary structure: tables, split layouts, stat blocks, lists. Do not turn every section into the same card.

**Motion**
- One orchestrated motion: the **truck slides to the next station** when a status changes (400 ms ease-out). Honour `prefers-reduced-motion`.
- Motion that answers an action (dialog open, toast, row expand) is fine. No decorative entrance animations.

## 3. Layouts
- **Desktop dashboards (manufacturer, escrow, admin):** left sidebar 264 px, navy, white logo on top, nav items with icons, active item has an amber left bar and a lighter navy fill. Top bar 64 px, white: global search, notification bell, language switch, user menu. Content max width 1280 px with 24–32 px gutters. Page header: title, short description, primary action at the end.
- **Detail pages** have a `← Back` ghost button (uses browser history, fallback to the list). Back must return to the exact previous filters, page, and scroll.
- **Driver app:** see §8.
- **Responsive:** desktop dashboards must still work at tablet width (sidebar collapses to icons) and be usable on a phone. The driver app is full-screen on real phones.

## 4. Shared component inventory
Build these once in `client/src/components`; every dashboard reuses them.

| Component | Behaviour |
|---|---|
| `AppShell`, `Sidebar`, `Topbar` | As §3 |
| `GlobalSearch` | Cmd/Ctrl-K or click. Debounced 300 ms. Groups: Shipments, Manufacturers, Drivers (only what the role may see). Enter opens the first hit |
| `NotificationBell` | Unread badge, dropdown with latest 10, "Mark all read", "See all". Polls every 15 s. Clicking an item marks it read and navigates to `link`. Text rendered client-side from `type` + `params` using i18n |
| `FilterBar` | Date range picker with presets (Today, 7 days, 30 days, This month, Custom), exact-date picker, search by shipment number, and optional selects (status, manufacturer, driver, city, goods category). **All state in the URL.** "Clear filters" button. Export CSV button |
| `DataTable` | Server-side pagination and sort, sticky header, row hover, clickable entity cells, skeleton rows, empty state, density toggle optional |
| `StatusChip` | Colours from §2, label per role (`01` §1) |
| `Money` | `752.000 JD`, tabular, right-aligned in tables |
| `DateTime` | Formats ISO in the user's time zone; shows a small zone label when it is not Amman; tooltip with the Amman time |
| `PhoneLink`, `MapLink` | `tel:` and Google Maps (`https://www.google.com/maps/search/?api=1&query=LAT,LNG`) |
| `TicketLink`, `ManufacturerLink`, `DriverLink` | Built by `lib/links.js` for the viewer's role. Plain-text variant exists for places where linking is forbidden (`01` §11) |
| `Timeline` (DottedRoute) | §7 |
| `KpiCard` | Number, label, optional delta/sparkline. Not every KPI needs the same shape: lead with the 1–2 numbers that matter |
| Charts | Recharts wrappers: `AreaTrend`, `BarCompare`, `Donut`. Navy and amber series, status colours for status charts |
| `MapView` | react-leaflet, OSM tiles, navy/amber markers, route polyline. LTR always |
| `LocationPicker` | §5 |
| `TruckSelector` | The cascade from `03` §4 as sequential selects; read-only auto-filled gross weight with payload shown as hint. Shows only categories the license class allows (signup) |
| `FileUpload` | Drag and drop, `accept` by kind (PDF or images), progress, preview (PDF icon + name, image thumbnails), remove, max 3 images for trucks |
| `PdfViewer` | Inline iframe with Download |
| `RatingStars`, `RatingForm`, `ReviewList` | 1–5 stars, comment textarea |
| `ConfirmDialog` / `ConfirmSheet` | Centered dialog on desktop, bottom sheet in the driver app |
| `Toast` | Short messages, same vocabulary as buttons ("Paid" after "Pay") |
| `EmptyState`, `ErrorState`, `Skeleton`, `TruckLoader` | §9 |
| `LanguageToggle`, `TimezoneSelect` | EN/AR, zones from `02` §6 |
| `PhoneFrame` | §8 |

## 5. Location picker (fewest taps)
One field, "Pickup location" / "Destination". Opens a popover (desktop) or bottom sheet (mobile) containing:
1. **Saved places** at the top. The default (or last used) is preselected. Each shows label, city, area. For destinations, a saved place also fills **name and phone**. Choosing a saved place = **2 taps**.
2. **Search box** (OpenStreetMap geocoding), results with city and area.
3. **Drop a pin** (small map, tap to place, reverse geocode fills the address).
4. **Paste a link or coordinates**: Google Maps links (incl. short links) and `lat,lng`.
Any newly chosen place is **saved automatically** (a "Save for next time" toggle is on by default) with an auto label from the address that can be edited inline. No separate "add location" form. After choosing, show a mini map with the pin and `city, area`.

## 6. Interlinked navigation
- Every shipment number, company name, and driver name is a link, everywhere, in every table and card.
- Ticket → manufacturer profile and driver profile; manufacturer profile → its tickets → their drivers; driver profile → his tickets → their manufacturers.
- Exceptions: on a driver's profile seen by a manufacturer, other manufacturers' names are plain text (`01` §11).
- `lib/links.js` exposes `linkTo(role, 'ticket' | 'manufacturer' | 'driver', id)` and returns the path in that role's route tree (`06`).
- Back works through real browser history; keep filters and pagination in the query string; restore scroll for the content container.

## 7. Timeline component (signature)
**Stations (6):** Requested · Paid · Accepted · Loaded · Delivered · Confirmed (internal statuses `requested, pending, waiting_load, in_delivery, delivered, audited`).
- Horizontal on desktop, vertical on mobile and in the driver app.
- Stations are connected by a **dotted line** (the logo's route). Completed segments: amber dots. Upcoming: slate dots. Station states: **done** (amber disc, navy check), **current** (ring pulse, the **truck icon** sits here), **upcoming** (hollow grey).
- Under each station: label, **date and time** in the user's zone, and the actor's name when useful ("Mr. Omar").
- Between **Accepted** and **Loaded** place a small marker for the **arrival event**: "Arrived 25 min early" (green), "On time" (green), "Arrived 40 min late" (amber). Hide until it exists.
- The pickup time appears as a faint reference tick on the arrival marker's tooltip.
- When the status changes while the page is open, the truck **slides to the next station** (400 ms). This is the single orchestrated animation.
- **Compact variant** for tables: six small dots with the current one filled.
- **Large variant** for the driver app (§8): vertical, big text (20 px), one line per station.
- Props: `statusHistory`, `events`, `pickupAt`, `variant`, `viewerRole`. Pure presentational; tested with the demo seed.

## 8. Driver app (mobile-first, 45+ users)
Designed for large, simple, high-contrast use. It is rendered full-screen on real phones and inside a **PhoneFrame** on desktop: a 400–430 px wide, ~860 px tall rounded device centered on a navy backdrop, with its own scroll.

Rules:
- Base text **18 px**, headings 22–28 px, never below 16 px. Colour contrast AAA where possible: navy on white.
- **Buttons 64 px tall**, full width, radius 16, one primary action per screen. Primary = amber with navy text. **Accept = green** `#15803D` with white text. Destructive/confirm sheets have two big buttons.
- **4 bottom tabs**, each 28 px icon + 15–16 px label: **Shipments · My shipment · Earnings · Me**. Active tab is navy with an amber indicator.
- Plain words. Statuses use the driver labels (`01` §1). The driver is addressed as "**Mr. {name}**" (AR: السيد). Money is always "Your earnings" in large bold.
- Cards show city → city (large), distance, pickup time, badges (Needs loading, Needs unloading, Customs, Hazardous) as icon + text pills (never icons alone), and **Your earnings** at the bottom right.
- **Busy driver:** the Accept button is disabled, grey, with the line "Finish your active shipment first" directly under it.
- Confirmation for destructive or irreversible actions (Accept, Delivered) uses a bottom sheet with two large buttons.
- Phone and map links are big tappable buttons ("Call", "Open in Google Maps").
- No hover-only interactions, no tiny controls, no dense tables, no horizontal scrolling.
- The active shipment screen shows the vertical **large timeline** and the **single next action** as a giant button ("I've arrived at pickup" → later "Delivered").

## 9. States (no screen may look broken)
- **Loading:** skeletons matching the final layout. For full-page transitions and long loads use `TruckLoader` (a short dotted line with a truck moving along it) with a plain line of text.
- **Empty:** one sentence saying what this screen is for and one action. Examples: "No shipments yet. Create your first shipment." / "No open shipments match your truck right now. New ones appear here."
- **Error:** say what failed and how to fix it, with a Retry button. No apologies, no vague text. "Couldn't load shipments. Check your connection and try again."
- **Forms:** inline field errors, disabled submit while saving, success toast.
- **Not found / wrong account** pages exist (`/open` resolver, 404).

## 10. Copy rules
- Sentence case. Plain verbs. Buttons say exactly what happens ("Pay now", "Confirm delivery", "Accept shipment"), and the toast repeats the same verb ("Paid", "Delivery confirmed").
- Name things by what users understand: **Shipment**, **Earnings**, **Pickup**, **Destination**.
- Never show internal keys (`waiting_load`) to users.
- All strings in `i18n/en.json` and `i18n/ar.json`. Arabic is real, natural Arabic, not machine-literal.

## 10b. Money display
`752.000 JD`: three decimals, thousands separators (`2,325.000 JD`), Western digits in both languages. Manufacturers see `Price`. Drivers see `Your earnings`. Admin/escrow see labelled breakdown lines.

## 11. Forms and validation
Light client-side validation only (required fields, min 500 JD, file type via `accept`, phone must start with `+`). The server does not validate.
- Signup forms are multi-step with a progress indicator (company → contacts → location → categories → documents; driver: details → documents → truck → payout).
- Phone inputs are free text with a hint "Include the country code, for example +962…". No prefilled country code.

## 12. Accessibility baseline
Visible focus ring (amber 2 px offset), semantic HTML, labels on inputs, `aria-label` on icon buttons, dialogs trap focus, colour never the only signal, minimum 44 px targets on mobile (64 px for primary driver actions).
