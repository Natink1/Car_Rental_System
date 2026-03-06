# NHK Car-Rental

Full-stack car rental system: Laravel API backend + React (Vite) frontend. JWT authentication, UUID primary keys, Spatie Media Library for car images, role-based access (customer, owner, admin), car approval workflow, bookings, chat, and payment simulation.

## Tech stack

- **Backend:** Laravel (latest), MySQL/SQLite, JWT (tymon/jwt-auth), Spatie Media Library, UUID primary keys
- **Frontend:** React (Vite), React Router, Axios, Context API, blue-themed responsive UI

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL (or SQLite for quick local use)

## Backend setup

1. **Install dependencies**
   ```bash
   cd backend
   composer install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` if needed (Laravel usually creates `.env` on install).
   - Set `APP_URL` to your backend URL **including port** when using `php artisan serve`, e.g. `APP_URL=http://localhost:8000`, so car image URLs point to the correct server. The API also uses the request host when generating image URLs so they work even if `APP_URL` is wrong.
   - For **MySQL**: set in `.env`:
     ```env
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=nhk_car_rental
     DB_USERNAME=your_user
     DB_PASSWORD=your_password
     ```
   - For **SQLite**: keep `DB_CONNECTION=sqlite` and ensure `database/database.sqlite` exists (created by default).

3. **App key**
   ```bash
   php artisan key:generate
   ```

4. **JWT**
   - JWT is already configured. Ensure `.env` has `JWT_SECRET` (set by `php artisan jwt:secret` if you run it again).
   ```bash
   php artisan jwt:secret
   ```

5. **Spatie Media Library**
   - No extra config needed. Media is stored in `storage/app/public`. Create the symlink:
   ```bash
   php artisan storage:link
   ```
   - **Image uploads:** Car images are validated (jpg/png/jpeg, max 2MB each). If uploads fail silently, check PHP limits in `php.ini`: `upload_max_filesize` and `post_max_size` (e.g. at least 8M).

6. **Migrations & seed**
   ```bash
   php artisan migrate:fresh --seed
   ```
   This creates:
   - Users: `admin@nhk.test`, `owner@nhk.test`, `customer@nhk.test` (password: `password`)
   - One sample approved car (if CarSeeder runs and can fetch image)

7. **CORS**
   - `config/cors.php` is published. For local frontend, set `allowed_origins` to include `http://localhost:5173` (or your Vite dev URL).

8. **Run API**
   ```bash
   php artisan serve
   ```
   API base URL: `http://localhost:8000`. API routes are under `/api`.

## Frontend setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment**
   - Create `frontend/.env` (optional):
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```
   If omitted, the app uses `http://localhost:8000/api` by default.

3. **Run dev server**
   ```bash
   npm run dev
   ```
   Frontend: `http://localhost:5173` (or the port Vite shows).

## Running both servers

- **Terminal 1 (backend):** `cd backend && php artisan serve`
- **Terminal 2 (frontend):** `cd frontend && npm run dev`

Then open `http://localhost:5173` in the browser.

## Seeder usage

- **Reset DB and seed:** `cd backend && php artisan migrate:fresh --seed`
- **Test users (password: `password`):**
  - Admin: `admin@nhk.test`
  - Owner: `owner@nhk.test`
  - Customer: `customer@nhk.test`

## Features

- **Auth:** Register (customer/owner), login, JWT, logout, role-based routes
- **Cars:** List (approved only), detail with gallery, owner can add (with at least one image), admin approves/rejects
- **Bookings:** Create (with date conflict check), list by role, cancel, owner approve/reject; admin cannot book
- **Chat:** Dedicated chat page, conversation list, unread badge, message bubbles, role labels, auto refresh
- **Payments:** Simulated completion (TODO: integrate real gateway)
- **Dashboards:** Customer (bookings, chat), Owner (cars, earnings, bookings, chat), Admin (stats, pending cars, approve/reject, chat)
- **Dates:** Display format “Mar 13, 2026” (no raw ISO)
- **UI:** Blue theme, clickable cards, status badges (pending/approved/rejected/cancelled)

## Project structure

- `backend/` – Laravel API (routes in `routes/api.php`, controllers in `app/Http/Controllers/Api/`)
- `frontend/` – React Vite app (pages in `src/pages/`, auth in `src/contexts/AuthContext.jsx`)
- `IMPLEMENTATION_PLAN.md` – Implementation plan and phase breakdown
