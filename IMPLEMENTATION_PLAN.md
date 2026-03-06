# NHK Car-Rental — Full Implementation Plan

## Overview
Full-stack car rental system: Laravel API backend + React (Vite) frontend. JWT auth, UUID PKs, Spatie Media Library, role-based access (customer, owner, admin), car approval workflow, booking, chat, payment simulation.

---

## Phase 1: Backend Setup

### 1.1 Laravel & Environment
- Create Laravel project (`composer create-project laravel/laravel backend`)
- Configure `.env`: `DB_CONNECTION=mysql`, database name, `APP_URL`
- Ensure `APP_DEBUG`, `APP_ENV` set

### 1.2 Dependencies
- `composer require tymon/jwt-auth`
- `composer require spatie/laravel-medialibrary`
- Publish JWT config: `php artisan jwt:secret`
- Publish Spatie config (if needed)

### 1.3 Files to Create/Modify
- `config/auth.php` — guards to use `api` with `tymon/jwt-auth`
- `app/Models/User.php` — implement `JWTSubject`, use `HasUuids` trait
- `.env` — JWT and DB config

---

## Phase 2: Database & UUID Setup

### 2.1 UUID Trait
- Create `app/Traits/HasUuids.php` — override `getKeyType()` and `getIncrementing()`; boot to set `uuid` on creating

### 2.2 Migrations (order matters)
1. **users** — id (uuid), name, email, password, role (enum: customer, owner, admin), timestamps
2. **cars** — id (uuid), user_id (owner), brand, model, year, transmission, fuel_type, seats, price_per_day, status (pending, approved, rejected), timestamps
3. **bookings** — id (uuid), user_id (customer), car_id, start_date, end_date, total_price, status (pending, approved, rejected, cancelled), timestamps
4. **payments** — id (uuid), booking_id, amount, payment_status (pending, completed, failed), transaction_reference, timestamps
5. **reviews** — id (uuid), user_id, car_id, rating, comment, timestamps
6. **conversations** — id (uuid), timestamps (or participant pivot if needed)
7. **conversation_user** — conversation_id, user_id (pivot for participants)
8. **messages** — id (uuid), conversation_id, user_id, body, read_at, timestamps
9. **media** — Spatie’s default migration (published from package)

### 2.3 Models
- User, Car, Booking, Payment, Review, Conversation, Message
- All use `HasUuids` and proper relations
- Car: `HasMedia`, `InteractsWithMedia` from Spatie

### 2.4 Seeders
- Roles: admin, owner, customer users
- Sample approved/pending cars (with media)
- Optional: sample bookings, conversations

---

## Phase 3: JWT Auth Setup

### 3.1 Auth Config
- `config/auth.php`: default guard `api`, driver `jwt`; providers for users

### 3.2 Routes (api.php)
- `POST /auth/register` — name, email, password, role (customer|owner)
- `POST /auth/login` — email, password → returns token
- `POST /auth/logout` — invalidate token (blacklist)
- `GET /auth/me` — current user (protected)

### 3.3 Controllers & Middleware
- `AuthController`: register, login, logout, me
- Middleware: `auth:api` (JWT), custom `CheckRole` (admin, owner, customer)
- Apply role middleware to admin/owner-only routes

---

## Phase 4: Car & Image System

### 4.1 Car Model
- `HasMedia`, `InteractsWithMedia`
- Validation: at least one image; types jpg, png, jpeg; max file size (e.g. 2MB per file)
- Register media collection e.g. `car-images`

### 4.2 Car API
- `GET /api/cars` — list only **approved** cars (public); optional filters (brand, dates, etc.)
- `GET /api/cars/{uuid}` — single car (approved only for non-admin) + media URLs
- `POST /api/cars` — owner only; status set to `pending`; attach images via Spatie
- `PUT /api/cars/{uuid}` — owner only (own cars)
- `PATCH /api/cars/{uuid}/approve` — admin only
- `PATCH /api/cars/{uuid}/reject` — admin only

### 4.3 Image Handling
- Store with Spatie; `getFirstMediaUrl('car-images')` and `getMedia('car-images')` for gallery
- API responses return full URLs (e.g. `Storage::url` or app URL)
- Ensure `php artisan storage:link` run

### 4.4 Admin Dashboard Endpoints
- `GET /api/admin/cars/pending` — list pending cars for approve/reject buttons

---

## Phase 5: Approval Workflow

### 5.1 Rules
- Owner creates car → status `pending`
- Only admin can approve/reject
- Owner cannot approve; admin cannot book
- Only approved cars in public listing and search

### 5.2 UI (Backend only for API)
- Admin: pending vehicles list; Approve/Reject as real buttons calling PATCH endpoints

---

## Phase 6: Booking System

### 6.1 Validation
- Start/end date required; end >= start
- **Date conflict**: no overlapping bookings for same car (same status not cancelled)
- Total price = (days) * car.price_per_day

### 6.2 Booking API
- `POST /api/bookings` — customer only; car_id, start_date, end_date
- `GET /api/bookings` — list by role: customer (own), owner (for their cars), admin (all)
- `GET /api/bookings/{uuid}` — show one
- `PATCH /api/bookings/{uuid}/cancel` — customer or owner (per policy)
- Optional: admin/owner `PATCH /api/bookings/{uuid}/approve` or reject

### 6.3 Status
- pending, approved, rejected, cancelled
- Response and UI use consistent status badges (pending=yellow, approved=green, rejected=red, cancelled=gray)

---

## Phase 7: Chat System

### 7.1 Structure
- **Conversations**: link two participants (customer-owner, customer-admin, owner-admin)
- **Messages**: conversation_id, user_id, body, read_at
- Unread: messages where `read_at` is null and recipient is current user

### 7.2 API
- `GET /api/conversations` — list conversations for current user; include last message, unread count
- `POST /api/conversations` — create or get existing (e.g. by participant user_id)
- `GET /api/conversations/{uuid}/messages` — paginated messages
- `POST /api/conversations/{uuid}/messages` — send message
- `PATCH /api/messages/{uuid}/read` — mark read
- Chat **not** tied to car detail page; dedicated Chat page with conversation list + message bubbles; role labels (Admin/Owner/Customer)

### 7.3 Behavior
- Auto-refresh (polling or WebSocket; spec says “auto refresh” — polling acceptable)
- Scroll to latest message
- Role label per participant

---

## Phase 8: Payment Simulation

### 8.1 Payment Model
- booking_id, amount, payment_status (pending, completed, failed), transaction_reference
- Comment in code: “TODO: Integrate real payment gateway here”

### 8.2 Flow
- On booking approval (or on “Pay” from UI): create Payment with status `completed` and fake `transaction_reference` (simulate success)
- `GET /api/bookings/{id}/payments` — list payments for booking
- No real gateway integration

---

## Phase 9: Reviews

### 9.1 API
- `GET /api/cars/{uuid}/reviews` — list reviews for car
- `POST /api/cars/{uuid}/reviews` — authenticated user; rating + comment (only after booking completed for that car — optional rule)

---

## Phase 10: Dashboards (API Data)

### 10.1 Customer
- Active bookings, booking history, chat access (links to chat)

### 10.2 Owner
- Their cars (with status badge), active bookings for their cars, earnings summary (from payments for their cars), chat access

### 10.3 Admin
- Total users, total cars, pending approvals count, total bookings, total revenue, chat access
- Pending vehicles list with Approve/Reject buttons (real buttons)

---

## Phase 11: Frontend Setup

### 11.1 Create App
- `npm create vite@latest frontend -- --template react`
- Install: react-router-dom, axios, (date library e.g. date-fns for “Mar 13, 2026”)

### 11.2 Structure
- `src/contexts/AuthContext.jsx` — store token, user, login, logout, register; axios default header `Authorization: Bearer <token>`
- `src/api/` — axios instance with base URL and interceptors (401 → logout)
- `src/pages/`, `src/components/`, `src/layouts/`
- Protected routes wrapper using auth context

### 11.3 Theming
- Blue theme: primary blue buttons, hover states, card shadows, rounded corners, clean spacing
- CSS variables or Tailwind: primary blue, secondary shades, backgrounds
- Responsive grid layout

---

## Phase 12: Frontend — Homepage

- Hero: “Drive Your Journey with NHK Car-Rental”
- Search form (optional: link to listing with query)
- Featured cars (from API, approved only)
- How it works (static section)
- Why choose us (static section)
- Testimonials (static or from API)
- Footer

---

## Phase 13: Frontend — Auth & Routing

- Login/Register pages
- Store JWT in localStorage (or httpOnly cookie if later)
- Protected route component; role-based redirect (customer → /dashboard, owner → /owner/dashboard, admin → /admin)
- Logout invalidates token (call backend logout)

---

## Phase 14: Frontend — Car Listing & Detail

- Listing: cards with image (first media), brand, model, price; entire card clickable
- Detail page: gallery (Spatie media), brand, model, year, transmission, fuel type, seats, price per day, owner info, reviews, date pickers (start/end), auto price calculation, “Book Now”, “Chat with Owner”, “Chat with Admin”
- Date format everywhere: “Mar 13, 2026” or “13 Mar 2026” (no raw ISO)

---

## Phase 15: Frontend — Booking UI

- Booking list: card design, car thumbnail, status badge (colored), entire card clickable, blue action buttons
- Create booking from car detail: date pickers, total, submit; conflict error shown if API returns 422

---

## Phase 16: Frontend — Chat

- Dedicated Chat page (route e.g. `/chat`)
- Sidebar: conversation list, unread badge
- Main: message bubbles (left/right), role label, scroll to bottom, auto refresh (polling)
- Start conversation from anywhere (not only from car page): e.g. “Chat with Owner” / “Chat with Admin” from car detail or from dashboard
- Works independently

---

## Phase 17: Frontend — Dashboards

- **Customer**: active bookings, history, chat link; real buttons
- **Owner**: cars (status badge), bookings, earnings, chat; real buttons
- **Admin**: stats (users, cars, pending, bookings, revenue), pending vehicles with Approve/Reject buttons (real), chat link
- All dates formatted (Mar 13, 2026)

---

## Phase 18: Frontend — Date Format & Polish

- Utility: `formatDisplayDate(isoString)` → “Mar 13, 2026”
- Use in: booking lists, dashboards, admin panels, chat references
- Never display raw ISO string

---

## Phase 19: Integration & Security Checks

- Only approved cars visible on public listing
- Admin cannot book (frontend hide + backend reject)
- Owner cannot approve (backend reject + frontend hide)
- File upload validation (type, size); at least one image required for car
- Role middleware on all sensitive endpoints
- JWT on all authenticated requests

---

## Phase 20: README

- Backend: PHP/Composer, MySQL, `.env` setup, JWT config, Spatie, `storage:link`, seeders, `php artisan serve`
- Frontend: Node, `npm install`, `npm run dev`; set API URL
- How to run both; optional: seeding instructions, test users (admin, owner, customer)

---

## File Summary

### Backend (Laravel)
- `app/Traits/HasUuids.php`
- `app/Models/User.php`, `Car.php`, `Booking.php`, `Payment.php`, `Review.php`, `Conversation.php`, `Message.php`
- Migrations: users, cars, bookings, payments, reviews, conversations, conversation_user, messages, media
- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Controllers/Api/CarController.php`, `AdminCarController.php`
- `app/Http/Controllers/Api/BookingController.php`, `PaymentController.php`, `ReviewController.php`
- `app/Http/Controllers/Api/ConversationController.php`, `MessageController.php`
- `app/Http/Middleware/CheckRole.php`
- `routes/api.php`
- Seeders: `UserSeeder`, `CarSeeder` (optional), `DatabaseSeeder`
- `config/auth.php` (guard api = jwt)

### Frontend (React)
- `src/contexts/AuthContext.jsx`
- `src/api/axios.js`
- `src/utils/dateFormat.js`
- `src/pages/HomePage.jsx`, `Login.jsx`, `Register.jsx`
- `src/pages/CarList.jsx`, `CarDetail.jsx`
- `src/pages/BookingList.jsx`, `BookingCard.jsx`
- `src/pages/Chat.jsx`, `ConversationList.jsx`, `MessageList.jsx`
- `src/pages/dashboards/CustomerDashboard.jsx`, `OwnerDashboard.jsx`, `AdminDashboard.jsx`
- `src/components/ProtectedRoute.jsx`, `Layout.jsx`, `Navbar.jsx`, `Footer.jsx`
- `src/App.jsx`, `src/main.jsx`
- Blue theme CSS / Tailwind config

---

## Order of Development

1. Backend setup (Laravel, DB, UUID, JWT, Spatie)
2. Migrations + models + seeders
3. Auth API (register, login, logout, me) + middleware
4. Car API + approval (pending/approve/reject) + media
5. Booking API + conflict validation
6. Payment model + simulate on booking
7. Reviews API
8. Chat (conversations + messages) API
9. Dashboard aggregation endpoints
10. Frontend: Vite, auth context, theme, routing
11. Homepage, login, register
12. Car list, car detail (gallery, dates, book, chat buttons)
13. Booking list + create booking
14. Chat page (list + messages + unread)
15. All three dashboards + date formatting
16. README and final checks
