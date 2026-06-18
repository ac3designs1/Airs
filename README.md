# NextAirs MDT

**Next-generation Police CAD & Records Management System for FiveM.**

Built with React + Vite (frontend) and Node.js + Express + SQLite (backend).

---

## Live Deployment (Vercel + Railway)

> The frontend is deployed to **Vercel** and the backend to **Railway**.
> This is the standard architecture for this type of app — Vercel's serverless
> environment does not support persistent databases (SQLite needs a persistent disk).

### 1 — Deploy the Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up (free tier is fine).
2. Click **New Project → Deploy from GitHub repo** and select this repo.
3. Railway will auto-detect `railway.json` and start the backend.
4. Add the following **Environment Variables** in Railway → *Variables*:

| Variable | Value |
|---|---|
| `JWT_SECRET` | A strong random string — generate with `node -e "require('crypto').randomBytes(64).toString('hex')\|console.log"` |
| `PORT` | Leave empty — Railway sets this automatically |
| `CORS_ORIGIN` | Your Vercel URL e.g. `https://nextairs.vercel.app` (add after step 3 below) |

5. In Railway → *Settings → Networking*, click **Generate Domain** to get your public backend URL.
   It will look like `https://nextairs-production.up.railway.app`.
6. Add a **Volume** in Railway (Storage → Add Volume) and mount it at `/data`.
   Then set `DB_FILE=/data/nextairs.db` in Railway Variables to persist the database.

---

### 2 — Deploy the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up.
2. Click **Add New → Project → Import from GitHub** and select this repo.
3. Vercel will detect `vercel.json` automatically — no extra config needed.
4. Add the following **Environment Variable** in Vercel → *Settings → Environment Variables*:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://YOUR_RAILWAY_URL.up.railway.app/api` |

5. Click **Deploy**. Your frontend will be live at `https://nextairs.vercel.app` (or similar).

6. **Important**: Go back to Railway and update `CORS_ORIGIN` to your actual Vercel URL (from step 5).
   Then redeploy the Railway service so CORS takes effect.

---

### 3 — Admin Login

On first boot, the database is seeded with a single admin account:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `Admin1234!` |

> **Change this password immediately after first login.**

---

## Local Development

### Prerequisites
- Node.js >= 20
- npm

### Setup

```bash
# Install all dependencies
npm run install:all

# Copy and edit backend env
cp backend/.env.example backend/.env
# Edit backend/.env and set JWT_SECRET to a strong random value

# Start backend (terminal 1)
npm run dev:backend

# Start frontend (terminal 2)
npm run dev:frontend
```

Frontend: http://localhost:5173
Backend API: http://localhost:3001/api/health

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js 22, Express.js, Socket.io |
| Database | SQLite via `node:sqlite` (built-in, no extra deps) |
| Auth | JWT (HS256), bcryptjs (12 rounds) |
| Security | Helmet.js, express-rate-limit, strict CORS |

---

## Features

- **Login / Auth** — JWT-based, role-aware, terminated-account blocking
- **Dashboard** — Live unit status, active calls, announcements
- **CAD / Dispatch** — Real-time call management with Socket.io
- **Citizens** — MDT lookup, full citizen records
- **Vehicles** — Plate lookup, registration records
- **Warrants** — Create, manage, serve warrants
- **Incidents** — Full case management with linked records
- **Roster** — Personnel management by department and rank
- **Promotions / Strikes** — Leadership-managed career tracking
- **Recruit Tracker** — Stage-by-stage recruit progression (CIRT-style)
- **FTO Tracking** — Field Training Officer shift logs
- **Leave Requests** — Submit and approve leave
- **Certifications** — EOI applications with approval workflow
- **Division Transfers** — EOI-based transfer request system
- **Announcements** — Force-wide communication board
- **Feedback** — Officer feedback submissions
- **Rewards** — Leadership-issued commendations
- **Leadership Command Centre** — Full admin panel: promote, strike, terminate, approve all requests
- **Duty Analytics** — Per-department shift statistics
- **Officer Management** — Per-officer performance stats
- **Settings** — Profile, password, and system settings

---

## Departments

- Academy
- GD (General Duties)
- Highway
- CIRT (Critical Incident Response Team)
- SOG (Special Operations Group)

## Roles (Hierarchy)

1. Recruit
2. Officer
3. Supervisor
4. Senior Command
5. Leadership
6. Administrator
7. Admin (full access)
