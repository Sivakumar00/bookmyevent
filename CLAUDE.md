# BookMyEvent – Codebase Reference

## Project Overview

Seat-based ticketing backend built with NestJS + TypeORM + PostgreSQL. Managed as a pnpm monorepo (Turborepo). The API lives at `apps/api`.

**Start dev server:** `pnpm dev`
**API port:** 3000
**Swagger UI:** `http://localhost:3000/api` (served from `openapi.json`)

---

## Monorepo Structure

```
bookmyevent/
├── apps/
│   └── api/                        # NestJS API
│       └── src/
│           ├── app/                # Root module + bootstrap
│           ├── common/             # Shared pipes, filters, response wrappers, middleware
│           ├── config/             # Database config (env-driven)
│           ├── entities/           # TypeORM entities
│           ├── migrations/         # Single consolidated Init migration
│           ├── routes/             # Feature modules (venues, events, tickets, orders)
│           └── shared/             # Error classes
├── packages/                       # Shared packages (if any)
├── openapi.json                    # Swagger spec (hand-maintained)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Database

- **Provider:** PostgreSQL
- **ORM:** TypeORM (`synchronize: false` — migrations only)
- **Config:** `apps/api/src/config/database.config.ts`
  - Env vars: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
  - Defaults: `localhost:5432`, user `postgres`, password `postgres`, db `bookmyevent`
- **Migrations:** Auto-run on startup via `MigrationRunner` (`OnModuleInit`)
- **Migration files:** `apps/api/src/migrations/` — single file `1776453574786-Init.ts`

---

## Entity Model

### Relationships

```
Venue ──< Seat
Venue ──< Event
Event ──< Ticket
Event ──< EventSeat
Seat  ──< EventSeat
Ticket ──< EventSeat (nullable — seat may be unallocated)
Order ──< OrderItem
EventSeat ──< OrderItem
```

### Venue (`venues`)

| Column                  | Type      | Notes |
| ----------------------- | --------- | ----- |
| id                      | uuid PK   |       |
| name                    | varchar   |       |
| location                | varchar   |       |
| capacity                | int       |       |
| created_at / updated_at | timestamp |       |

### Seat (`seats`)

| Column   | Type                          | Notes          |
| -------- | ----------------------------- | -------------- |
| id       | uuid PK                       |                |
| venue_id | uuid FK→venues                | CASCADE delete |
| row      | varchar                       | e.g. "A"       |
| number   | int                           |                |
| —        | UNIQUE(venue_id, row, number) |                |

### Event (`events`)

| Column                  | Type           | Notes                         |
| ----------------------- | -------------- | ----------------------------- |
| id                      | uuid PK        |                               |
| name                    | varchar(150)   |                               |
| description             | text           |                               |
| start_time / end_time   | timestamp      |                               |
| venue_id                | uuid FK→venues | RESTRICT delete               |
| status                  | varchar        | DRAFT / PUBLISHED / CANCELLED |
| created_at / updated_at | timestamp      |                               |

### Ticket (`tickets`)

| Column                  | Type                   | Notes             |
| ----------------------- | ---------------------- | ----------------- |
| id                      | uuid PK                |                   |
| event_id                | uuid FK→events         | CASCADE delete    |
| type                    | varchar                | e.g. VIP, Regular |
| price                   | decimal(10,2)          |                   |
| created_at / updated_at | timestamp              |                   |
| —                       | UNIQUE(event_id, type) |                   |

### EventSeat (`event_seats`)

| Column     | Type                       | Notes                                     |
| ---------- | -------------------------- | ----------------------------------------- |
| id         | uuid PK                    |                                           |
| event_id   | uuid FK→events             | CASCADE delete                            |
| seat_id    | uuid FK→seats              | CASCADE delete                            |
| ticket_id  | uuid FK→tickets (nullable) | SET NULL on delete                        |
| status     | varchar                    | AVAILABLE / RESERVED / BOOKED             |
| expires_at | timestamp (nullable)       | Set on reserve, cleared on confirm/cancel |
| created_at | timestamp                  | DEFAULT CURRENT_TIMESTAMP                 |
| —          | UNIQUE(event_id, seat_id)  |                                           |
| —          | INDEX(event_id, status)    | Performance index                         |

### Order (`orders`)

| Column                  | Type                      | Notes                                      |
| ----------------------- | ------------------------- | ------------------------------------------ |
| id                      | uuid PK                   |                                            |
| user_email              | varchar                   |                                            |
| status                  | varchar                   | RESERVED / CONFIRMED / CANCELLED / EXPIRED |
| total_amount            | decimal(10,2)             |                                            |
| expires_at              | timestamp (nullable)      | 10 min from creation                       |
| created_at / updated_at | timestamp                 |                                            |
| —                       | INDEX(status, expires_at) | For expiry job queries                     |

### OrderItem (`order_items`)

| Column            | Type                | Notes                                    |
| ----------------- | ------------------- | ---------------------------------------- |
| id                | uuid PK             |                                          |
| order_id          | uuid FK→orders      | CASCADE delete                           |
| event_seat_id     | uuid FK→event_seats |                                          |
| price_at_purchase | decimal(10,2)       | Snapshot of ticket price at booking time |

---

## API Routes

### Venues — `/venues`

| Method | Path                      | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| POST   | /venues                   | Create venue                            |
| GET    | /venues                   | List venues (paginated, searchable)     |
| GET    | /venues/:id               | Get venue                               |
| PATCH  | /venues/:id               | Update venue                            |
| DELETE | /venues/:id               | Delete venue (blocked if has events)    |
| GET    | /venues/:id/seats         | List seats for venue                    |
| GET    | /venues/:id/events        | List events at venue                    |
| POST   | /venues/:id/seats         | Create single seat                      |
| POST   | /venues/:id/seats/bulk    | Bulk create seats (rows × number range) |
| DELETE | /venues/:id/seats/:seatId | Delete single seat                      |
| DELETE | /venues/:id/seats/bulk    | Bulk delete seats by IDs                |

### Events — `/events`

| Method | Path                                     | Description                                                                                        |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| POST   | /events                                  | Create event                                                                                       |
| GET    | /events                                  | List events (paginated, searchable)                                                                |
| GET    | /events/:id                              | Get event                                                                                          |
| PATCH  | /events/:id                              | Update event                                                                                       |
| DELETE | /events/:id                              | Delete event (blocked if has BOOKED seats)                                                         |
| GET    | /events/:id/seats                        | Per-seat list with row, number, ticket type, price, status (paginated; optional `?status=` filter) |
| GET    | /events/:id/seats/status                 | Seat availability summary (total/available/reserved/booked counts)                                 |
| POST   | /events/:id/seat-allocation              | Allocate seats to a ticket type                                                                    |
| GET    | /events/:id/seat-allocation              | List allocations (optional ?ticketId filter)                                                       |
| DELETE | /events/:id/seat-allocation/:eventSeatId | Remove a seat allocation                                                                           |
| POST   | /events/:id/seat-allocation/release      | Manually release expired reserved seats                                                            |

### Tickets — `/events/:eventId/tickets`

| Method | Path                               | Description                                         |
| ------ | ---------------------------------- | --------------------------------------------------- |
| POST   | /events/:eventId/tickets           | Create ticket type for event                        |
| GET    | /events/:eventId/tickets           | List ticket types for event (paginated, searchable) |
| GET    | /events/:eventId/tickets/:ticketId | Get ticket                                          |
| PATCH  | /events/:eventId/tickets/:ticketId | Update ticket                                       |
| DELETE | /events/:eventId/tickets/:ticketId | Delete ticket (blocked if seats allocated)          |

### Orders — `/orders`

| Method | Path                | Description                                          |
| ------ | ------------------- | ---------------------------------------------------- |
| POST   | /orders             | Reserve seats — creates order + reserves event_seats |
| GET    | /orders             | List orders (paginated)                              |
| GET    | /orders/:id         | Get order with items                                 |
| POST   | /orders/:id/confirm | Confirm order → seats become BOOKED                  |
| POST   | /orders/:id/cancel  | Cancel order → seats return to AVAILABLE             |
| PATCH  | /orders/:id         | Update order status (validated)                      |
| DELETE | /orders/:id         | Delete order (blocked if CONFIRMED)                  |

---

## System Flow

```
1. Create Venue
2. Bulk-create Seats for Venue
3. Create Event (linked to Venue)
4. Create Ticket types for Event (VIP, Regular, etc.)
5. Allocate Seats → Ticket (POST /events/:id/seat-allocation)
6. User POSTs /orders  →  seats RESERVED (10 min TTL)
7. User POSTs /orders/:id/confirm  →  seats BOOKED
   OR
   User POSTs /orders/:id/cancel   →  seats AVAILABLE
8. Background job (not yet implemented) OR
   POST /events/:id/seat-allocation/release to expire stale reservations
```

### Seat Lifecycle

```
AVAILABLE → RESERVED (on order create, expires_at = now + 10min)
RESERVED  → BOOKED   (on order confirm)
RESERVED  → AVAILABLE (on order cancel or expiry release)
```

---

## Concurrency & Safety

- All booking operations use **database transactions** (`DataSource.createQueryRunner`)
- Seat rows are locked with `SELECT ... FOR UPDATE` (`pessimistic_write`) before status change
- Duplicate seat IDs in a single order request are rejected with 409 before DB hit
- `UNIQUE(event_id, seat_id)` on `event_seats` prevents double-allocation at DB level

---

## Validation

### Request validation

- Uses **Joi schemas** via `JoiValidationPipe` (custom pipe, `apps/api/src/common/joi-validation.pipe.ts`)
- Applied with `@UsePipes` or inline via `@Req()` pattern on PATCH routes
- Schema files: `*.validation.ts` alongside each feature module

### Business validation (service layer)

- Seat allocation: ticket must belong to event (`ticket.eventId === eventId`)
- Seat allocation: all seats must belong to the event's venue (`seat.venueId === event.venueId`)
- Order: seats must be AVAILABLE and belong to the specified event
- Order confirm/cancel: order must be in valid state (not already confirmed/cancelled/expired)
- Venue delete: blocked if venue has events
- Event delete: blocked if event has BOOKED seats
- Ticket delete: blocked if ticket has allocated event_seats

---

## Error Handling

**Error classes** (`apps/api/src/shared/errors.ts`):

| Class                | HTTP | Code               |
| -------------------- | ---- | ------------------ |
| `NotFoundError`      | 404  | `NOT_FOUND`        |
| `BadRequestError`    | 400  | `BAD_REQUEST`      |
| `ConflictError`      | 409  | `CONFLICT`         |
| `UnprocessableError` | 422  | `VALIDATION_ERROR` |

**When to use each:**

- `NotFoundError` — resource does not exist
- `BadRequestError` — invalid state / business rule violation (wrong order status, event cancelled, etc.)
- `ConflictError` — duplicate booking, duplicate seat IDs, seat already allocated
- `UnprocessableError` — ownership mismatch (seat not in venue, ticket not in event)

**Error response shape:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Selected seats are not available: <id>",
    "details": null
  }
}
```

**Filter:** `AppErrorFilter` (`apps/api/src/common/app-error.filter.ts`) — global, handles `AppError` subclasses, `HttpException`, and unhandled errors. Logs with `activityId`.

**Success response shape:**

```json
{ "success": true, "data": {}, "message": "..." }
```

**Paginated response shape:**

```json
{
  "success": true,
  "data": [],
  "pagination": { "skip": 0, "take": 50, "total": 100 }
}
```

---

## Common Modules

| File                                  | Purpose                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `common/joi-validation.pipe.ts`       | Joi-based validation pipe                                                                     |
| `common/base-response.ts`             | `ApiResponse`, `ApiError`, `PaginatedResponse` classes                                        |
| `common/pagination.dto.ts`            | `PaginationQueryDto` (skip, take, sortBy, sortOrder, search)                                  |
| `common/app-error.filter.ts`          | Global exception filter with logging                                                          |
| `common/request-logger.middleware.ts` | Logs `START`/`END` per request with `activityId` (from `x-activity-id` header or random UUID) |

---

## Module Dependency Summary

```
AppModule
├── EventsModule   → [Event, Venue, Ticket, EventSeat, Seat]
├── TicketsModule  → [Ticket, EventSeat]
├── OrdersModule   → [Order, OrderItem, EventSeat, Event, Ticket]
└── VenuesModule   → [Venue, Seat, Event, EventSeat]
```

---

## Known Gaps (Future Work)

- **Automated expiry job:** No cron scheduler exists yet. Seat expiry is triggered manually via `POST /events/:id/seat-allocation/release`. A background job should poll `orders` by `(status=RESERVED, expires_at < now)` and release seats.
- **Authentication:** No auth layer implemented.
