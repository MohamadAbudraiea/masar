# 07 — Notifications and Emails

Two channels: **in-app** (always) and **email** (Resend, English only). Ratings are in-app only.

## 1. Architecture
- `services/notifications.js` exposes `notify({ userIds, type, params, ticketId, link, email })`. It inserts `notifications` rows, then (after commit) sends the email if `email` is set and the channel rules in §4 allow it.
- **In-app text is rendered by the client** from `type` + `params` using i18n, so it works in English and Arabic.
- **Email** text is rendered on the server (English) with React Email templates in `server/src/emails/`.
- `link` is the in-app path **for that recipient's role** (see `06` §7), built by the server (`services/links.js`).
- Email failures are logged and never break a request. No retries.

## 2. Catalog
`Ch.`: **A** = in-app, **E** = email. "Free drivers" = qualified drivers with no active shipment.

### Accounts
| Type key | Recipient | Ch. | In-app text (EN) |
|---|---|---|---|
| `signup_pending_admin` | Admin | A+E | New {role} awaiting approval: {name} |
| `signup_received` | New user | E | (email only, user cannot log in to a dashboard yet) |
| `account_approved` | User | A+E | Your account is approved |
| `account_rejected` | User | E | (email only; reason also shown on the pending screen) |
| `account_created_by_admin` | User | E | (email with temporary password) |

### Shipment lifecycle
| Type key | Recipient | Ch. | In-app text (EN) |
|---|---|---|---|
| `ticket_created` | Manufacturer | A | Shipment {n} created. Pay to publish it |
| `payment_received_mfr` | Manufacturer | A+E | Payment received. {n} is now open for drivers |
| `payment_received_escrow` | Escrow | A+E | {amount} received for {n} from {company} |
| `new_match` | Free qualified drivers | A+E | New shipment: {from} to {to}, your earnings {earnings} |
| `driver_accepted_mfr` | Manufacturer | A+E | Mr. {driver} accepted {n} |
| `driver_accepted_driver` | Driver | A+E | You accepted {n}. See pickup details |
| `driver_arrived` | Manufacturer | A | Mr. {driver} arrived at pickup ({early_late}) |
| `loaded_mfr` | Manufacturer | A+E | {n} is on its way |
| `loaded_driver` | Driver | A | Loading confirmed. Safe trip |
| `delivered_mfr` | Manufacturer | A+E | {n} was delivered. Verify with the receiver and confirm |
| `delivered_driver` | Driver | A | Delivered. Your earnings {earnings} are pending release |
| `delivered_escrow` | Escrow | A | {n} delivered, awaiting confirmation |
| `payout_driver` | Driver | A+E | {amount} transferred successfully to your account {iban} |
| `confirmed_mfr` | Manufacturer | A+E | Delivery of {n} confirmed. Please rate Mr. {driver} |
| `release_escrow` | Escrow | A+E | {n} released: full breakdown |
| `masar_income` | Admin | A | Masar commission +{amount} from {n} |

### Ratings (in-app only)
| `rating_received` | Rated user | A | {from} rated you {stars}★ |

### Parked (do not build now)
Unpaid reminders, unconfirmed-delivery reminders, late-arrival alerts, all cancellation, refund, and dispute notifications.

## 3. Money and privacy in content
- Manufacturers: price only, never commissions.
- Drivers: earnings only ("Your earnings"), never the price.
- Escrow and admin: full numbers.
- Payout wording is always a notification: "752.000 JD transferred successfully to your account JO…". No real transfer happens.

## 4. Channel rules
- The user setting `email_notifications` (default on) controls every email **except** the four account emails: `signup_received`, `account_approved`, `account_rejected`, `account_created_by_admin` (and the admin's own new-signup email follows the toggle). The toggle only appears in Settings after approval.
- Drivers without an email get in-app only. A manufacturer with several emails: send to **all** of `manufacturer_profiles.emails`.
- `EMAIL_REDIRECT_TO` set → every email goes to that address (prefix the subject with `[TEST → original@address]`).
- Emails always format times in **Asia/Amman** with the zone label.
- Language: English only.

## 5. Email templates (15)
Shared `layout.jsx`: navy header with the logo/wordmark, white body, amber **primary button**, small footer (support email, "Manage notifications" link to settings), mobile-friendly, plain-text fallback auto-generated. Sender: `Masar <no-reply@…>` from `EMAIL_FROM`.
Body pattern: one-line headline, 2–3 key facts (route, pickup time, price/earnings), the button. No long paragraphs. Subject starts with the shipment number when there is one.

| # | Template | Recipient | Subject | Primary button → destination | Secondary link |
|---|---|---|---|---|---|
| 1 | `NewSignupAdmin` (manufacturer / driver variants) | Admin | New {role} awaiting approval | Open in approvals → `/admin/approvals?id=…` | — |
| 2 | `SignupReceived` | New user | We received your signup | Log in → `/login` | — |
| 3 | `AccountApproved` | User | Your Masar account is approved | Open your dashboard → role home | — |
| 4 | `AccountRejected` | User | Update on your Masar signup | Log in and see the reason → `/login` | — |
| 5 | `AccountCreatedByAdmin` | User | Your Masar account is ready | Log in → `/login` (shows temporary password) | — |
| 6 | `PaymentReceived` | Manufacturer | {n}: Payment received | View shipment | — |
| 7 | `FundsHeld` | Escrow | {n}: Funds received | Held-funds record → `/escrow/held?q={n}` | Company profile |
| 8 | `NewMatch` | Driver | {n}: New shipment for your truck | See shipment → `/driver/shipments/:id` | — |
| 9 | `DriverAccepted` | Manufacturer | {n}: Mr. {driver} accepted your shipment | **Driver profile** → `/manufacturer/drivers/:id` | View shipment |
| 10 | `ShipmentAccepted` | Driver | {n}: You accepted this shipment | See pickup details → `/driver/active` | — |
| 11 | `OnItsWay` | Manufacturer | {n}: Your shipment is on its way | Track shipment | — |
| 12 | `DeliveredConfirm` | Manufacturer | {n}: Delivered, please confirm | View and confirm → shipment (action highlighted) | Driver profile |
| 13 | `PayoutComplete` | Driver | {n}: {amount} transferred to your account | View earnings → `/driver/earnings` | — |
| 14 | `DeliveryConfirmed` | Manufacturer | {n}: Delivery confirmed | View shipment | — |
| 15 | `ReleaseRecord` | Escrow | {n}: Release record | Release record → `/escrow/releases?q={n}` | Company profile |

Provide a dev-only page **`/dev/emails`** (enabled when `NODE_ENV !== 'production'`, or via a flag) that renders all 15 templates with sample data so they can be reviewed without triggering real flows. Server route `GET /api/dev/emails/:template` returns the rendered HTML.

## 6. Deep links
Every email button points to `${FRONTEND_URL}/open?to=<encodedPath>&as=<recipientUserId>`. The resolver page (`06` §1.6):
1. Logged out → login, then redirect to `to`.
2. Logged in as another user → "This link is for another account" with **Switch account**.
3. Logged in as the right user → navigate to `to`.
In-app notifications use the same `link` path directly.

## 7. Resend setup notes
- Use the `resend` SDK: `resend.emails.send({ from, to, subject, html, text })`, with `html` from `@react-email/render`.
- To send to arbitrary addresses the sender domain must be **verified** in Resend; otherwise Resend only delivers to the account owner's email. Use `EMAIL_REDIRECT_TO` for rehearsals.
- The demo admin and escrow accounts use real inboxes from `DEMO_ADMIN_EMAIL` and `DEMO_ESCROW_EMAIL`.
