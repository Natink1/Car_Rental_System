# NHK Car-Rental Codebase Architecture

## Purpose

This document summarizes the current structure and inner workings of the repository in `/home/mr-n/Final Project AAU`.

The project is a full-stack car rental system with:

- a Laravel 12 API backend in `backend/`
- a React 19 + Vite frontend in `frontend/`
- JWT-based authentication
- UUID primary keys across domain tables
- Spatie Media Library for uploaded images
- role-based behavior for `customer`, `owner`, and `admin`
- booking approval and payment flows
- private chat with Laravel broadcasting / Echo / Reverb-compatible setup

The repo is organized as a two-application workspace rather than a monolith where Laravel serves the frontend.

## Top-Level Repository Layout

| Path | Role |
| --- | --- |
| `README.md` | Project-level setup and feature summary |
| `IMPLEMENTATION_PLAN.md` | Planning document describing intended phases and features |
| `backend/` | Laravel API application |
| `frontend/` | React/Vite client application |

## High-Level Runtime Architecture

The system runs as two separate processes in local development:

1. The React frontend runs on Vite, usually `http://localhost:5173`.
2. The Laravel backend runs separately, usually `http://localhost:8000`.
3. The frontend talks to the backend over JSON HTTP via Axios.
4. Authentication is JWT-based. Tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>`.
5. Uploaded media is stored through Spatie Media Library on Laravel's `public` disk.
6. Chat uses normal HTTP for listing/loading/sending, plus private broadcast channels for real-time message delivery when Echo/Reverb is available.

Conceptually the request path looks like this:

`React page -> api/*.js wrapper -> Axios instance -> Laravel route -> controller -> Eloquent model/database/media -> JSON response -> React state/UI`

For chat, there is a second path:

`MessageController::store -> MessageSent event -> private broadcast channel -> Echo listener in Chat.jsx`

## Backend Architecture

## Backend Entry and Framework Wiring

Key backend wiring is in `backend/bootstrap/app.php`.

- Laravel registers route files for web, api, console, and broadcasting channels.
- A custom middleware alias `role` is registered there and points to `App\Http\Middleware\CheckRole`.
- Health check routing is enabled through Laravel's standard `health: '/up'`.

Relevant files:

- `backend/bootstrap/app.php`
- `backend/app/Http/Middleware/CheckRole.php`
- `backend/routes/api.php`
- `backend/routes/channels.php`

## Backend Directory Structure

| Path | Responsibility |
| --- | --- |
| `backend/app/Http/Controllers/Api/` | All application API endpoints and most business logic |
| `backend/app/Models/` | Eloquent domain models |
| `backend/app/Events/` | Broadcast event for chat |
| `backend/app/Helpers/` | Media URL normalization helper |
| `backend/app/Traits/` | Shared UUID behavior |
| `backend/database/migrations/` | Schema definition |
| `backend/database/seeders/` | Seed users and sample cars |
| `backend/config/` | Auth, JWT, broadcasting, CORS, services |
| `backend/routes/` | API, web, console, and broadcast channel definitions |
| `backend/tests/` | Only default example tests; no meaningful coverage yet |

## Authentication and Authorization Model

Authentication is JWT-based rather than Laravel Sanctum or session auth.

Core configuration:

- `backend/config/auth.php`
  - default guard is `api`
  - `api` guard uses driver `jwt`
- `backend/config/jwt.php`
  - JWT TTL defaults to 60 minutes
  - token blacklisting is enabled

User roles are implemented as a string column on `users.role` rather than separate role tables or policies.

Roles:

- `customer`
- `owner`
- `admin`

Authorization is enforced in two ways:

- route-level middleware such as `middleware('role:owner')`
- explicit controller checks such as `if ($user->isAdmin())`

This means security rules are spread across routes and controllers instead of being centralized in policies.

## Core Backend Models and Their Responsibilities

### `User`

File: `backend/app/Models/User.php`

Responsibilities:

- authenticatable identity for JWT
- stores `name`, `email`, `phone`, `password`, `role`
- owns cars
- creates bookings and reviews
- participates in conversations
- stores a single ID image in Spatie Media Library under collection `id-image`

Notable details:

- appends computed `id_image_url` to serialized output
- implements `JWTSubject`
- exposes convenience helpers `isAdmin()`, `isOwner()`, `isCustomer()`

### `Car`

File: `backend/app/Models/Car.php`

Responsibilities:

- rental inventory owned by an `owner`
- stores listing information such as brand, model, year, transmission, fuel type, seat count, price, and moderation status
- stores one or more images in media collection `car-images`

Status values:

- `pending`
- `approved`
- `rejected`

Important helper:

- `hasActiveOrUpcomingBooking()` blocks editing or deleting a car when an approved booking still exists for today or the future

### `Booking`

File: `backend/app/Models/Booking.php`

Responsibilities:

- links a user to a car for a date range
- stores total price and status
- owns payments

Status values:

- `pending`
- `approved`
- `rejected`
- `cancelled`

### `Payment`

File: `backend/app/Models/Payment.php`

Responsibilities:

- stores payment records against bookings
- used both for Chapa verification results and simulated payment completion

Status values:

- `pending`
- `completed`
- `failed`

In practice, the current code mostly records `completed` payments.

### `Review`

File: `backend/app/Models/Review.php`

Responsibilities:

- stores 1 to 5 star ratings and optional comments on cars
- linked to both the user and the car

### `Conversation`

File: `backend/app/Models/Conversation.php`

Responsibilities:

- chat container between two participants
- linked to users through `conversation_user`
- owns many messages

The model does not explicitly enforce "exactly two participants", but controller behavior assumes direct one-to-one conversations.

### `Message`

File: `backend/app/Models/Message.php`

Responsibilities:

- chat message body
- sender (`user_id`)
- conversation link
- `read_at` timestamp

## Database Schema

The schema is UUID-first for all domain entities except Spatie media records.

Main tables:

- `users`
- `cars`
- `bookings`
- `payments`
- `reviews`
- `conversations`
- `conversation_user`
- `messages`
- `media`

Relationships:

- `users -> cars` is one-to-many
- `users -> bookings` is one-to-many
- `users -> reviews` is one-to-many
- `users <-> conversations` is many-to-many through `conversation_user`
- `conversations -> messages` is one-to-many
- `cars -> bookings` is one-to-many
- `cars -> reviews` is one-to-many
- `bookings -> payments` is one-to-many

Schema notes:

- `users.phone` was added later by a follow-up migration.
- There are two older migrations related to `id_image_path`; they reflect an earlier design before moving owner ID uploads into Spatie Media Library.
- `media` uses Spatie's polymorphic UUID morphs so it can attach to both `User` and `Car`.

## Backend Routing Surface

All real application behavior is behind `backend/routes/api.php`.

Public routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/cars`
- `GET /api/cars/{id}`
- `GET /api/cars/{carId}/reviews`
- `GET /api/payments/chapa-callback`

Authenticated routes cover:

- current user session management
- owner car CRUD
- bookings
- payments
- reviews
- conversations and messages
- role-specific dashboards
- admin moderation and user management

There is also a broadcast auth route:

- `POST /api/broadcasting/auth`

`backend/routes/web.php` and `backend/routes/console.php` still contain Laravel defaults and are not part of the product flow.

## Backend Business Flows

### 1. Registration and Login

Controller: `backend/app/Http/Controllers/Api/AuthController.php`

Registration flow:

1. Validate common fields.
2. Restrict self-registration roles to `customer` or `owner`.
3. Require `phone` for both roles.
4. Require an uploaded `id_image` if role is `owner`.
5. Create the user.
6. Attach ID image through Spatie if present.
7. Immediately issue a JWT and return both `user` and `token`.

Login flow:

1. Validate credentials.
2. Attempt JWT auth through guard `api`.
3. Return token and user payload.

Password change:

- requires current password
- validates new password and confirmation
- is exposed at `PATCH /api/auth/password`

### 2. Car Listing and Moderation

Controller: `backend/app/Http/Controllers/Api/CarController.php`

Public listing behavior:

- only approved cars are listed
- supports filters for keyword, brand, price range, transmission, fuel type, and seat count
- supports a `featured=1` mode that returns up to six random cars without pagination
- includes review count and average rating

Car detail behavior:

- guests can only see approved cars
- owners can see their own unapproved cars
- admins can see any car
- response is shaped by `formatCar()`

`formatCar()` is a critical internal method because it:

- resolves media URLs
- exposes first image plus gallery images
- includes aggregated review metrics
- includes owner info if loaded
- includes `can_owner_edit` and raw media IDs for owners
- computes current rental window and upcoming approved booked ranges

Owner create/update/delete behavior:

- owner can create a car only with at least one valid image
- new cars always start as `pending`
- owner can edit only their own cars
- owner can delete only their own cars
- edit/delete is blocked when there is a current or future approved booking
- rejected cars can be resubmitted with `reapply()`, which simply flips status back to `pending`

Admin moderation behavior lives separately in `AdminCarController`:

- `pending()` lists pending cars with owner info and images
- `approve()` sets status to `approved`
- `reject()` sets status to `rejected`
- admins are explicitly prevented from approving/rejecting their own car record if they somehow own one

### 3. Booking Flow

Controller: `backend/app/Http/Controllers/Api/BookingController.php`

Create booking flow:

1. Only `customer` and `owner` may create bookings; admins are blocked.
2. Validate `car_id`, `start_date`, and `end_date`.
3. Require the target car to exist and already be `approved`.
4. Detect overlapping bookings for the same car, ignoring `cancelled` and `rejected`.
5. Calculate total price as inclusive day count times `price_per_day`.
6. Save booking with initial status `pending`.

Role-specific booking listing:

- admin sees all bookings
- owner sees bookings for cars they own
- customer sees only their own bookings

Booking approval flow:

- only owners can approve or reject bookings for their own cars
- admin is intentionally blocked from approval even though admin can see bookings
- approval changes only the booking status; it does not create a payment

Booking cancellation:

- customer can cancel their own booking
- owner can cancel bookings on their own cars
- only `pending` and `approved` bookings may be cancelled

Formatting:

- `formatBooking()` normalizes dates, total price, image, owner info, user info, and embedded payments

### 4. Payment Flow

Controller: `backend/app/Http/Controllers/Api/PaymentController.php`

The code supports two payment modes:

- Chapa initialization + verification
- local simulation for testing

Chapa initialization:

1. Load booking and ensure current user owns the booking.
2. Require booking status `approved`.
3. Reject if a completed payment already exists.
4. Read Chapa secret from `config/services.php`.
5. Build a short `tx_ref`.
6. Cache `tx_ref -> booking_id` for two hours.
7. Call Chapa's initialize endpoint.
8. Return `checkout_url` and `tx_ref`.

Verification:

- callback mode: `chapaCallback()` handles Chapa's server redirect/callback query params
- frontend mode: `verifyChapa()` lets the frontend ask Laravel to verify a cached `tx_ref`

Both modes delegate to `verifyAndRecordChapaPayment()`:

1. Verify the transaction with Chapa.
2. Reject anything not marked `success`.
3. If a completed payment already exists, update the reference if needed and return success.
4. Otherwise create a new completed payment row.
5. Clear cached `tx_ref`.

Simulation:

- `simulate()` creates a completed payment with a `SIM-...` reference
- this is useful for development, but the current frontend mostly uses the Chapa flow instead

Important implication:

- booking approval and payment completion are separate states
- a booking can be `approved` but still unpaid

### 5. Review Flow

Controller: `backend/app/Http/Controllers/Api/ReviewController.php`

Behavior:

- public review listing is allowed only for approved cars
- authenticated users can submit one review per car
- current code does not require that the user actually completed a booking before reviewing

This is worth knowing because the UI may imply "customer feedback", but the backend rule is simply "logged-in user, one review per car".

### 6. Chat Flow

Controllers:

- `ConversationController`
- `MessageController`

Event:

- `MessageSent`

Broadcast authorization:

- `backend/routes/channels.php`

Conversation behavior:

- `index()` lists the current user's conversations
- each item includes:
  - the other participant
  - truncated last message
  - unread count based on messages sent by someone else with `read_at = null`
- `getOrCreate()` either finds an existing direct conversation between the two users or creates a new one
- `show()` returns conversation participants
- `markRead()` marks all messages from the other participant as read

Message behavior:

- `index()` loads all messages in order and computes `is_mine`
- `store()` validates body, checks membership, creates the message, loads sender info, then broadcasts `MessageSent`
- `markRead()` marks an individual message as read if the current user is not the sender

Broadcast behavior:

- `MessageSent` implements `ShouldBroadcast`
- each message is broadcast on `PrivateChannel('conversation.{conversation_id}')`
- channel authorization checks that the current user is a participant in that conversation

Practical design choice:

- HTTP remains the source of truth for loading conversations and messages
- broadcasting is used to push new messages into the currently open conversation
- unread counters are still recomputed through API requests rather than fully synchronized through real-time state

### 7. Dashboard Aggregation

Controller: `backend/app/Http/Controllers/Api/DashboardController.php`

Admin dashboard:

- total users
- total cars
- count of pending car approvals
- total bookings
- revenue = sum of completed payments

Owner dashboard:

- all owner cars with light formatting
- approved cars
- pending/rejected cars
- active bookings on owned cars
- earnings from completed payments on owned cars
- rejected listing count

Customer dashboard:

- active bookings
- booking history
- each booking embeds car, owner, and payment info

The dashboard controller is an aggregation layer rather than a separate service. It prepares data specifically for the current frontend screens.

## Backend Helpers and Shared Patterns

### UUID trait

File: `backend/app/Traits/HasUuids.php`

Used by almost every domain model. It:

- generates UUIDs on create
- marks keys as non-incrementing
- marks key type as string

### Media URL normalization

File: `backend/app/Helpers/MediaUrlHelper.php`

Purpose:

- Spatie's generated URLs can point at the wrong host/port if `APP_URL` is wrong
- the helper rewrites media URLs to the current request host when needed

This helper is why image responses work even when local development ports are inconsistent.

## Frontend Architecture

## Frontend Entry Structure

Main files:

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/contexts/AuthContext.jsx`

Boot flow:

1. `main.jsx` renders `<App />`.
2. `App.jsx` wraps the app in `AuthProvider`.
3. `BrowserRouter` manages navigation.
4. `ToastContainer` provides global notifications.
5. Route elements are wrapped in a shared `Layout`.

## Frontend Directory Structure

| Path | Responsibility |
| --- | --- |
| `frontend/src/api/` | Thin wrappers around backend endpoints |
| `frontend/src/components/` | Shared UI pieces |
| `frontend/src/contexts/` | Global auth state |
| `frontend/src/pages/` | Route-level screens |
| `frontend/src/pages/dashboards/` | Role-specific dashboards |
| `frontend/src/utils/` | Formatting and image URL helpers |
| `frontend/src/echo.js` | Laravel Echo client bootstrap |

## Frontend Routing Model

Routes are declared directly in `frontend/src/App.jsx`.

Public routes:

- `/`
- `/login`
- `/register`
- `/cars`
- `/cars/:id`
- `/chat`

Protected routes:

- `/bookings` for `customer` and `owner`
- `/owner/cars/new` for `owner`
- `/owner/cars/:id/edit` for `owner`
- `/customer/dashboard` for `customer`
- `/owner/dashboard` for `owner`
- `/admin/dashboard` for `admin`
- `/admin/cars/:id` for `admin`
- `/admin/users` for `admin`

`ProtectedRoute` does three things:

- waits for auth bootstrap to finish
- redirects anonymous users to `/login`
- redirects logged-in users away from disallowed role pages to their own dashboard

## Frontend Authentication State

File: `frontend/src/contexts/AuthContext.jsx`

This is the only real shared application state container.

Responsibilities:

- initialize user from `localStorage`
- call `auth/me` on app boot when a token exists
- expose `login`, `register`, and `logout`
- persist token and user to `localStorage`
- clear auth state on an `auth-logout` browser event
- disconnect Echo on logout

Design implications:

- auth survives full page reloads
- current user data comes from both `localStorage` and a bootstrap API revalidation call
- failed `auth/me` causes the local session to be cleared

## Frontend API Layer

All HTTP calls go through `frontend/src/api/axios.js`.

Important behavior:

- base URL comes from `VITE_API_URL` with fallback `http://localhost:8000/api`
- bearer token is injected from `localStorage`
- `FormData` uploads intentionally drop the JSON `Content-Type`
- only a 401 on `GET auth/me` triggers forced logout

The rest of the API files are very thin wrappers:

- `auth.js` -> auth/session/password
- `cars.js` -> cars, reviews, owner car mutation
- `bookings.js` -> list/create/approve/reject
- `payments.js` -> Chapa initialize and verify
- `conversations.js` -> list/create/messages/mark read
- `dashboard.js` -> role dashboards
- `admin.js` -> admin users and pending car moderation
- `admins.js` -> list admin users

The frontend is intentionally page-driven rather than building a rich client-side domain model.

## Frontend Layout and Shared Components

### `Layout`

Simple wrapper around:

- `Navbar`
- page `main`
- `Footer`

### `Navbar`

This is more important than a typical nav component because it also acts as a lightweight notification layer.

It polls backend endpoints to compute badges for:

- unread chat messages
- admin pending approvals
- owner pending booking approvals
- owner rejected listings
- unpaid booking counts
- customer pending bookings

It also contains:

- profile dropdown
- logout action
- `ChangePasswordModal`

State synchronization uses both polling and custom browser events such as:

- `chat-unread-changed`
- `admin-pending-changed`
- `owner-pending-changed`
- `owner-rejected-changed`
- `customer-pending-changed`

This is a deliberate lightweight alternative to introducing a larger client-state library.

### Shared utility components

- `ConfirmModal` for destructive confirmation
- `ChapaPaymentModal` for payment handoff
- `PaymentReceiptActions` for opening Chapa test receipts
- `StarRating` for visualizing average and individual ratings
- `ChangePasswordModal` for inline password changes

## Frontend Utilities

- `utils/dateFormat.js`
  - formats dates to human-readable forms like `Mar 13, 2026`
- `utils/currency.js`
  - formats ETB currency
- `utils/imageUrl.js`
  - resolves relative media paths against the backend origin

## Frontend Page Responsibilities

### `HomePage`

Responsibilities:

- hero and static marketing sections
- featured cars fetch from `cars?featured=1`
- quick search form that redirects to `/cars` with query parameters

This page is mostly presentation plus lightweight entry into the car search flow.

### `Login` and `Register`

Responsibilities:

- collect credentials
- call auth context methods
- show toast errors/success
- redirect by role after registration

Registration includes owner-specific ID image upload and phone capture, mirroring backend validation.

### `CarList`

Responsibilities:

- main browsing and filtering screen
- sync filters into URL query parameters
- debounce filter updates
- call `carsApi.list()`
- support backend pagination

This page is the frontend counterpart to `CarController::index`.

### `CarDetail`

This is the densest page in the app.

Responsibilities:

- fetch car detail
- fetch reviews separately
- fetch admin list to support "Chat with Admin"
- render image gallery
- calculate booking days and total price client-side
- submit bookings
- submit reviews
- start conversations with owner or admin
- allow owner edit/delete controls on their own car
- show booking availability cues from backend-provided `current_rental` and `booked_ranges`

This page is where multiple subsystems meet:

- cars
- bookings
- reviews
- conversations
- owner actions

### `BookingList`

Responsibilities:

- list bookings for current user context
- launch Chapa payment modal for approved unpaid bookings
- verify pending Chapa transactions on focus or return
- show receipt action when a real Chapa reference exists

This page overlaps somewhat with `CustomerDashboard`, but is more booking-focused.

### `AddCar`

Responsibilities:

- collect car listing fields
- collect one or more images
- preview selected images
- send multipart upload to owner car create endpoint

### `EditCar`

Responsibilities:

- fetch car detail
- block editing if backend says `can_owner_edit` is false
- mark existing media for removal
- queue replacement images
- send `_method=PUT` via `POST /cars/{id}`
- allow delete confirmation

Important nuance:

- when new images are added, the page sends `replace_images=1`, so saving with new files replaces the full image set

### `Chat`

Responsibilities:

- load conversation list
- select a conversation from URL or first item
- fetch messages for selected conversation
- mark selected conversation as read
- subscribe to a private Echo channel for live messages
- send new messages over HTTP
- keep scroll pinned near the bottom

The page still works without Echo because HTTP fetch/send remains primary.

### `CustomerDashboard`

Responsibilities:

- show active bookings and history
- open chat or chat with first admin
- manage Chapa payment verification similarly to `BookingList`
- show unpaid/paid state

### `OwnerDashboard`

Responsibilities:

- show earnings summary
- show counts for pending listings, rejected listings, pending approval requests, paid, and unpaid bookings
- approve/reject booking requests
- show paid and unpaid bookings separately
- manage owner cars by status
- reapply rejected listings
- delete cars
- start chat with admin

This page is the operational center for owners.

### `AdminDashboard`

Responsibilities:

- fetch admin summary metrics
- fetch pending cars
- quick approve/reject actions
- link to detailed car moderation screen
- link to user management and chat

### `AdminCarDetail`

Responsibilities:

- fetch full car detail through the normal car detail API
- display owner identity
- review gallery and vehicle metadata
- approve or reject pending listings

### `AdminUsers`

Responsibilities:

- list all users
- create customer, owner, or admin accounts
- require owner ID upload
- show owner ID image in a modal
- show user detail modal

This page is the only frontend consumer of admin user creation endpoints.

## Real-Time Chat Wiring

Frontend file: `frontend/src/echo.js`

Behavior:

- lazily creates a single Echo instance
- reads token from `localStorage`
- authenticates private channels through `/api/broadcasting/auth`
- supports Reverb-compatible WebSocket settings through `VITE_REVERB_*`

The `Chat` page subscribes to:

- `private-conversation.<conversationId>`

and listens for:

- `.message.sent`

This maps directly to the backend `MessageSent` event.

## Styling Model

Primary styling lives in `frontend/src/index.css`.

Observations:

- uses Tailwind import plus a large amount of custom CSS variables and handcrafted classes
- theme is blue-centered
- common classes like `.btn`, `.card`, `.badge`, `.container`, `.grid` are shared across pages

`frontend/src/App.css` appears to be leftover Vite starter CSS and is not part of the current app flow.

## End-to-End System Flows

## Flow A: Owner registration

1. User opens `/register`.
2. Chooses role `owner`.
3. Uploads an ID image and phone number.
4. Frontend sends multipart form data.
5. `AuthController::register()` validates owner-specific fields.
6. User row is created.
7. ID image is stored in media collection `id-image`.
8. JWT token is returned.
9. Frontend stores token and user, then redirects to owner dashboard.

## Flow B: Car listing approval

1. Owner opens `/owner/cars/new`.
2. Submits vehicle details and one or more images.
3. `CarController::store()` saves the car as `pending`.
4. Admin dashboard polls pending counts and lists the new car.
5. Admin approves or rejects from dashboard or detail screen.
6. Approved cars become visible in public listing and detail pages.
7. Rejected cars stay hidden from public views but remain visible to the owner.

## Flow C: Booking and payment

1. Customer opens a car detail page.
2. Selects start and end dates.
3. Frontend computes estimated total.
4. `BookingController::store()` validates availability and creates `pending` booking.
5. Owner dashboard surfaces the booking under "Needs approval".
6. Owner approves the booking.
7. Customer dashboard and booking list now show it as `approved`.
8. Customer opens Chapa payment modal.
9. Backend initializes a Chapa transaction and caches `tx_ref -> booking`.
10. Customer completes payment externally.
11. Frontend or callback asks backend to verify `tx_ref`.
12. Backend records a completed payment row.
13. Dashboards update revenue and paid/unpaid indicators.

## Flow D: Chat

1. User clicks "Chat with Owner" or "Chat with Admin", or opens `/chat`.
2. Frontend calls `POST /conversations` with the other user's ID.
3. Backend returns existing conversation or creates a new one.
4. `Chat.jsx` fetches messages for the selected conversation.
5. Sending a message performs HTTP `POST /conversations/{id}/messages`.
6. Backend stores the message and broadcasts `MessageSent`.
7. Active listeners on the same conversation receive the live event.
8. Read state is updated via `mark-read`.
9. Navbar unread count is refreshed via polling and browser events.

## Coupling and Design Characteristics

The codebase has a few strong architectural patterns:

- Controllers contain most business logic.
- Eloquent models are thin and mostly relationship-focused.
- There is no explicit service layer, repository layer, or policy layer.
- API response shaping is done manually inside controllers.
- The frontend is page-driven and intentionally simple.
- Shared client state is minimal and mostly limited to auth plus local page state.
- Cross-page synchronization is handled with polling and browser events instead of a centralized state store.

This makes the project straightforward to trace, but it also means:

- controller files carry validation, authorization, querying, formatting, and state transition logic together
- repeated concepts such as booking status or payment checks live in multiple places
- some backend endpoints expose more capability than the frontend currently uses

## Gaps, Unused Pieces, and Practical Notes

### Likely unused or leftover frontend files

- `frontend/src/App.css` looks like default Vite starter CSS and is not imported by the app.
- `frontend/src/pages/ChangePassword.jsx` exists but the active UI uses `ChangePasswordModal` from the navbar instead.

### Backend endpoints not clearly used by the current frontend

- `GET /api/my-cars`
- `PATCH /api/bookings/{id}/cancel`
- `GET /api/bookings/{bookingId}/payments`
- `POST /api/bookings/{bookingId}/payments/simulate`
- `GET /api/conversations/{id}`
- `PATCH /api/messages/{id}/read`

These routes may exist for future use, manual testing, or earlier UI designs.

### Likely chat realtime mismatch

The backend broadcasts messages on private channel `conversation.{id}`, but `frontend/src/pages/Chat.jsx` currently calls `echo.private('private-conversation.{id}')`.

Because Echo normally adds the `private-` prefix itself, this naming looks inconsistent with the backend channel definition. The practical impact is that chat still works through HTTP, but live broadcast delivery may not behave as intended until the frontend and backend channel names are aligned.

### Test coverage

`backend/tests/` only contains Laravel's example test stubs. There is effectively no automated application-level test coverage in the repo as it currently stands.

### README mismatch

The root `README.md` is broadly accurate on features, but some concrete seeded credentials described there differ from the actual `UserSeeder`, which currently creates accounts under `@nhk.com` rather than `@nhk.test`.

## Mental Model for Extending the System

If you need to modify or extend this app, the most efficient way to think about it is:

- backend controllers are the true source of business rules
- models define relationships and a few key helpers
- dashboards are custom aggregations, not generic resources
- the frontend mostly mirrors backend route groupings one page at a time
- chat is partly real-time, but HTTP is still the core behavior
- media handling is centralized through Spatie, not raw file paths

That means most feature work usually touches:

1. one controller method or route in Laravel
2. one thin API wrapper in `frontend/src/api/`
3. one route page in `frontend/src/pages/` or `frontend/src/pages/dashboards/`

## Concise Structure Map

`backend/`

- framework wiring: `bootstrap/app.php`
- route surface: `routes/api.php`, `routes/channels.php`
- business logic: `app/Http/Controllers/Api/`
- data model: `app/Models/`
- cross-cutting helpers: `app/Helpers/`, `app/Traits/`, `app/Events/`, `app/Http/Middleware/`
- schema and seed data: `database/migrations/`, `database/seeders/`
- auth/broadcast/payment config: `config/auth.php`, `config/jwt.php`, `config/broadcasting.php`, `config/services.php`

`frontend/`

- app bootstrap and routing: `src/main.jsx`, `src/App.jsx`
- auth state: `src/contexts/AuthContext.jsx`
- HTTP wrappers: `src/api/`
- route screens: `src/pages/`, `src/pages/dashboards/`
- shared UI: `src/components/`
- chat realtime bootstrap: `src/echo.js`
- formatting and URL helpers: `src/utils/`
- shared styling: `src/index.css`
