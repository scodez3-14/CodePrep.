# LeetTrack (CodePrep)

Lightweight React + Node.js/MongoDB app to track LeetCode problems by company. Frontend (Vite + React + Tailwind) calls a small Express + Mongoose backend for auth and persisting solved problems.

## Repo layout

- `my-project/` — React frontend (Vite)
  - `src/` — React source
    - `components/` — `AuthForm.jsx`, `NavBar.jsx`, `Dashboard.jsx`, `CompanyProblems.jsx`, etc.
  - `vite.config.js` — dev server proxy (`/api -> http://localhost:3001`)
- `server/` — Express + Mongoose backend
  - `index.js` — API routes: `/api/register`, `/api/login`, `/api/user`, `/api/solved`
  - `models/User.js` — Mongoose user schema
  - `.env` — contains `MONGODB_URI`

## Quick start (development)

Prerequisites
- Node.js (v16+ recommended; v22 used during development)
- npm
- A MongoDB connection string (Atlas or local)

1) Backend

- Configure environment

  Create or edit `server/.env` with:

  ```bash
  MONGODB_URI="your-mongodb-connection-string"
  PORT=3001
  ```

- Install and start the server

  ```bash
  cd server
  npm install
  npm start
  ```

  The server will log `Server listening on port 3001` and `MongoDB connected!` when healthy.

2) Frontend

- Install and start the Vite dev server

  ```bash
  cd my-project
  npm install
  npm run dev
  ```

- Open the app in the browser (Vite will show the local URL, usually `http://localhost:5173`). The dev server proxies `/api` to the backend.

## API (quick reference)

All endpoints accept and return JSON.

- POST /api/register
  - Body: { email, password }
  - Success: 201 { message, user: { email } }

- POST /api/login
  - Body: { email, password }
  - Success: 200 { message, user: { email } }

- POST /api/user
  - Body: { email }
  - Success: 200 { email, solved: [], solvedDates: [], recent: [] }

- POST /api/solved
  - Body: { email, problemId, action } // action: 'add' | 'remove'
  - Success: 200 { message, user: { email, solved, solvedDates, recent } }

Notes: The backend returns full user lists (without password) for `/api/user` and `/api/solved`.

## Frontend behavior
- Authentication: `AuthForm.jsx` calls `/api/register` and `/api/login`; after success it fetches `/api/user` and the app saves the returned profile to localStorage so the session persists across reloads.
- CompanyProblems: marks problems as solved using a unique key `company::problemName` and calls `/api/solved` with `action: 'add'` or `'remove'`.
- Dashboard: fetches `/api/user` for solved/solvedDates/recent. Recent activity displays the last 3 items.
