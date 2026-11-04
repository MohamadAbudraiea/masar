# 00 — Overview

## 1. What Masar is
Masar (مسار) manages the delivery of goods from large manufacturers to their resellers or any destination. A manufacturer posts a **shipment** with requirements and pays the full delivery price into an **escrow company**. Qualified **drivers** see it, one accepts, the goods move, the manufacturer confirms delivery, and escrow releases the money automatically: Masar's commission, the escrow company's commission, and the rest to the driver.

Receivers and destinations have **no account and no dashboard** in this version.

## 2. Goal of this MVP
A convincing, working **demo** with a real database. It will be shown on several devices at once, in Jordan and in the EU, to people including the CEO. Therefore:
- UX and UI are the most important deliverable. Professional, calm, fast-feeling.
- The backend just has to work. No security hardening, no rate limits, no heavy validation.
- Everything shown must be backed by real data in PostgreSQL (Supabase), not mocks.

## 3. Roles and dashboards
| Role | Accounts | Dashboard | Signup |
|---|---|---|---|
| **Admin** | 1 prefilled (Masar staff) | Desktop | None. Can also create users manually |
| **Escrow company** | 1 prefilled (SafePay Escrow) | Desktop | None |
| **Manufacturer** | Many | Desktop, big and rich | Signup form, needs admin approval |
| **Driver** | Many | **Mobile-first app**, shown in a phone frame on desktop. Users are **45+**, so large, simple, high contrast | Signup form, needs admin approval |

A signed-up user who is not yet approved can log in but only sees a "Pending approval" screen. A rejected user sees the admin's reason. Users created by the admin are approved automatically.

## 4. Terminology (strict)
| Concept | UI (EN) | UI (AR) | Code / DB |
|---|---|---|---|
| Order | **Shipment** | شحنة | `ticket` |
| Driver in driver app | **Mr. {name}** | السيد {name} | `driver` |
| Driver elsewhere | Driver | سائق | `driver` |
| Final status | "Delivered & confirmed" | تم التسليم والتأكيد | `audited` |
| The audit action | **Confirm delivery** | تأكيد التسليم | `confirm` |
| Escrow company | Escrow | حساب الضمان | `escrow` |
| سجل تجاري | Commercial registration | السجل التجاري | `commercial_registration` |
| رخصة المهن | Professions license | رخصة المهن | `professions_license` |

Ticket numbers look like `MSR-000124`.

## 5. In scope (build all of this)
- Landing page (informational, bilingual)
- Single login page; signup for manufacturers and drivers; admin approval queue; admin can add manufacturers/drivers manually
- Shipment creation with location picker, truck suggestion, conditional fields, customs fields
- Full normal-case lifecycle: `requested → pending → waiting_load → in_delivery → delivered → audited`
- Escrow split and simulated payout notification
- Matching between shipments and drivers; one active shipment per driver
- Ratings (1–5 plus text) after `audited`
- In-app notifications and email notifications (Resend), with a per-user email on/off toggle
- Four dashboards with dynamic reports, interlinked profiles, global search
- Shipment timeline (dotted-route component) with timestamps and early/late arrival indicator
- Shipment summary PDF (three role-specific versions)
- Admin live map, simulated truck movement (demo only), and activity feed
- Settings: edit everything except documents; language; time zone; email toggle
- English + Arabic UI with RTL

## 6. Non-goals (do NOT build)
- **Cancellations, refunds, disputes** (designed for later; see §8)
- User suspension / reactivation (every approved user stays active)
- Forgot-password flow (admin resets passwords)
- Real payments, real bank transfers (payout is a notification only)
- Real GPS tracking
- SMS notifications
- Rate limiting, input sanitising, security audit
- Changing a driver's truck from settings (only admin can edit it)
- Multiple trucks per driver
- A "reset demo data" button (re-seed from the command line instead)

## 7. Parked for the CEO conversation
- Driver visibility window: drivers only see shipments whose pickup is within the next **48 hours** (configurable, see `02`). This rule exists but is flagged for discussion.
- Daily cron job: reminders and **auto-confirm** when a manufacturer never confirms delivery.

## 8. Designed for later (keep the door open, do not build)
Cancellations and disputes will add statuses and money movements later. Therefore:
- `tickets.status` has a CHECK constraint that is easy to extend by migration.
- `status_history` and `events` are JSONB and can hold new entries (actor, reason).
- `ledger_entries.entry_type` can gain `refund` types.
- The admin overview reserves a **Cancel rate** KPI slot, hidden until cancellations exist.

## 9. Assumptions made while writing these docs
These were not explicitly confirmed. Implement them as written; they are easy to change.
1. Drivers enter a **driver license class** (4 / 5 / 6) at signup, and the truck form hides categories they are not licensed for (light and medium need 4, heavy rigid and heavy service need 5, tractor + trailer needs 6, tankers need 5).
2. Drivers also enter a **plate number** for their truck.
3. Before accepting, a driver does **not** see the manufacturer's identity. After accepting, he sees the manufacturer's name, phone, rating, and location.
4. The Arabic UI uses Western digits (0–9) for money, phones, and dates.
5. The login page can show tap-to-fill **demo accounts** (controlled by `VITE_SHOW_DEMO_ACCOUNTS`).
6. Distance and route use the public OSRM server, falling back to a straight line.
