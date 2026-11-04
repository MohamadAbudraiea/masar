# Masar (مسار)

Masar manages the delivery of goods from large manufacturers to their resellers or any destination. A manufacturer posts a shipment with requirements and pays the full delivery price into an escrow company. Qualified drivers see it, one accepts, the goods move, the manufacturer confirms delivery, and escrow releases the money automatically.

## Tech Stack
- **Frontend**: React 18, Vite, JavaScript, React Router v6, TanStack Query v5, Tailwind CSS, Radix UI, Leaflet, react-i18next.
- **Backend**: Node 20, Express 4, `pg` (Raw SQL with parameters, no ORM), `bcryptjs`, `jsonwebtoken`, Cloudflare R2, Resend.
- **Database**: PostgreSQL on Supabase (Permanent UTC+3: `Asia/Amman`).

## Structure
- `server/`: Express backend API & database scripts (`db/schema.sql`, `db/seed/`).
- `client/`: React frontend app (Desktop dashboards for Admin/Escrow/Manufacturer, phone-framed mobile app for Drivers).
- `MD-Files/`: Project specifications and reference documentation.

## to run backend and frontend:
- Backend: cd server/ --> npm run dev
- Frontend:  cd client/ -->npm run dev
