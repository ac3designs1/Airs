# Airs

This repository is set up to deploy the React frontend on Vercel and run the backend separately on a standard Node host.

## Deployment shape

- `frontend/`: Vite + React app, ready for Vercel.
- `backend/`: Express + Socket.IO + SQLite API, not suitable for Vercel serverless as-is.

The backend keeps a local SQLite database and expects a long-running Node server for Express and Socket.IO. Vercel's serverless platform is not a good fit for that runtime model.

## Vercel setup

1. Import this GitHub repository into Vercel.
2. Leave the project root at the repository root. `vercel.json` builds `frontend/` and publishes `frontend/dist`.
3. Add this environment variable in Vercel:

```bash
VITE_API_BASE_URL=https://your-backend-domain.example/api
```

4. Deploy.

## Backend setup

Deploy `backend/` to a Node host such as Railway, Render, Fly.io, or a VPS.

Create `backend/.env` from `backend/.env.example` and set:

```bash
PORT=3001
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=https://your-project.vercel.app
```

If you use a custom domain on Vercel, include that domain in `CORS_ORIGIN` too. Multiple origins can be comma-separated.

## Local development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

The frontend defaults to `/api`, and `frontend/.env.example` shows the local Vite configuration value when you want to point directly at the backend.