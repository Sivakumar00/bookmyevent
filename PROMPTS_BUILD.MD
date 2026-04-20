## Phase 1: Project Setup

### Prompt 1.1: Initial Turborepo Setup

```
You are a senior software engineer specialised in backend. I created this new nest js repo using turborepos.

## Goal

I want to build a ticketing system that allows event organisers to create & manage the events and user to purchase/reserve the tickets.

## Setup

Steps:

1. Setup husky commit hook
2. Setup prettier, eslint and typescript configuration - best in industry standards
3. Setup the jest UT setup

wait for next prompt after the completing the steps. Stop and clarify if you have any doubt for this whole session.
```

### Prompt 1.2: OpenAPI Spec Setup

```
## OpenAPI Spec setup

1. Setup openAPI spec 3.x .yaml file
2. Setup swagger ui with nestjs
3. Update openapi.yaml:
   - check the nest js api routes and update the routes in the spec file.
   - Check all the params, payload and query changes
   - After the updation, check whether the spec is valid
```

### Prompt 1.3: Database Setup (with DB Diagram)

```
## Setup Database:

- Install typeorm latest and setup into nest js project
- setup postgres db
- setup migration in typeorm along with migration commands using DB diagram script given below
- Turn off auto creation table, tables should be created only by migration scripts. not by typeorm sync
```

### DB Diagram script

```
Table venues {
  id uuid [pk]
  name varchar
  location varchar
  capacity int
  createdAt timestamp
  updatedAt timestamp
}

Table events {
  id uuid [pk]
  name varchar(150)
  description text
  startTime timestamp
  endTime timestamp
  venueId uuid [ref: > venues.id]
  status varchar // DRAFT, PUBLISHED, CANCELLED
  createdAt timestamp
  updatedAt timestamp

  Indexes {
    (venueId)
  }
}

Table tickets {
  id uuid [pk]
  eventId uuid [ref: > events.id]
  type varchar // VIP, REGULAR
  price decimal
  totalQuantity int
  availableQuantity int
  createdAt timestamp
  updatedAt timestamp

  Indexes {
    (eventId)
    (eventId, type) [unique]
  }
}

Table orders {
  id uuid [pk]
  userEmail varchar
  status varchar // RESERVED, CONFIRMED, CANCELLED, EXPIRED
  totalAmount decimal
  expiresAt timestamp
  createdAt timestamp
  updatedAt timestamp

  Indexes {
    (userEmail)
    (status)
  }
}

Table order_items {
  id uuid [pk]
  orderId uuid [ref: > orders.id]
  ticketId uuid [ref: > tickets.id]
  quantity int
  priceAtPurchase decimal

  Indexes {
    (orderId)
    (ticketId)
  }
}

Table seats {
  id uuid [pk]
  venueId uuid [ref: > venues.id]
  row varchar
  number int

  Indexes {
    (venueId)
  }
}

Table event_seats {
  id uuid [pk]
  eventId uuid [ref: > events.id]
  seatId uuid [ref: > seats.id]
  ticketId uuid [ref: > tickets.id]
  status varchar // AVAILABLE, RESERVED, BOOKED

  Indexes {
    (eventId)
    (eventId, status)
    (ticketId)
  }
}
```

### Prompt 1.4: Validator & Logger Setup

```
## Setup Validator & logger:

- Setup Joi validator for request validation
- Write a global error handler for handling API error
- Create logger service to track the API routes with activity Id
```

---

## Phase 2: Implementation Prompts

### Prompt 2.1: Entity Creation

```
Create the following entities in typeorm:
- Venue (has many Seats, has many Events)
- Seat (belongs to Venue)
- Event (belongs to Venue, has many Tickets, has many EventSeats)
- Ticket (belongs to Event)
- EventSeat (belongs to Event, belongs to Seat, belongs to Ticket nullable)
- Order (has many OrderItems)
- OrderItem (belongs to Order, belongs to EventSeat)

Follow the schema in dbdiagram script.
```

### Prompt 2.2: Venue Module

```
Create venue module with full CRUD endpoints:
- POST /venues - create
- GET /venues - list (paginated)
- GET /venues/:id - get one
- PATCH /venues/:id - update
- DELETE /venues/:id - delete (blocked if has events)

Also create seat management under venue:
- GET /venues/:id/seats - list
- GET /venues/:id/events - events at venue
- POST /venues/:id/seats - create single
- POST /venues/:id/seats/bulk - bulk create
- DELETE /venues/:id/seats/:seatId - delete single
- DELETE /venues/:id/seats/bulk - bulk delete
```

### Prompt 2.3: Event Module

```
Create event module:
- POST /events - create
- GET /events - list (paginated)
- GET /events/:id - get one
- PATCH /events/:id - update
- DELETE /events/:id - delete (blocked if has BOOKED seats)

Seat management under event:
- GET /events/:id/seats - list with details
- GET /events/:id/seats/status - availability summary

Seat allocation:
- POST /events/:id/seat-allocation - allocate seats to ticket
- GET /events/:id/seat-allocation - list allocations
- DELETE /events/:id/seat-allocation/:eventSeatId - remove allocation
- POST /events/:id/seat-allocation/release - release expired
```

### Prompt 2.4: Ticket Module

```
Create ticket module (nested under events):
- POST /events/:eventId/tickets - create ticket type
- GET /events/:eventId/tickets - list
- GET /events/:eventId/tickets/:ticketId - get
- PATCH /events/:eventId/tickets/:ticketId - update
- DELETE /events/:eventId/tickets/:ticketId - delete (blocked if seats allocated)
```

### Prompt 2.5: Order Module

```
Create order module:
- POST /orders - create order (reserve seats, 10 min TTL)
- GET /orders - list
- GET /orders/:id - get with items
- POST /orders/:id/confirm - confirm (seats become BOOKED)
- POST /orders/:id/cancel - cancel (seats become AVAILABLE)
- PATCH /orders/:id - update status
- DELETE /orders/:id - delete (blocked if CONFIRMED)
```

---

## Phase 3: Testing & Validation Prompts

### Prompt 3.1: Validation Testing

```
Validate the migration file and entity are aligned
```

### Prompt 3.2: OpenAPI Fix

```
Fix swagger issue: GET /events/{eventId}/tickets returns "Validation failed (uuid is expected)"
```

---

## Phase 4: Documentation Prompts

### Prompt 4.1: Create README

```
Prepare a full fledged documentation of this project from setup, guides, architecture, route details, end to end scenarios and other important details for project reviewers
```

### Prompt 4.2: Docker Setup

```
Dockerize this application
Requirements:

1. Use production best practices (small image size, caching, security)
2. Use multi-stage builds if applicable
3. Use .dockerignore
4. Environment variables should be configurable
5. Should support local development and production separately

Deliverables:

Optimized Dockerfile
docker-compose.yml (if multiple services like DB)
.dockerignore
Step-by-step commands to build and run
Explanation of key decisions (brief, not too long)
```

---

## Complete Codebase Structure

```
bookmyevent/
├── apps/api/src/
│   ├── app/              # AppModule, bootstrap
│   ├── common/           # Pipes, filters, middleware, DTOs
│   ├── config/           # Database config
│   ├── entities/         # 7 TypeORM entities
│   ├── migrations/       # MigrationRunner, Init migration
│   ├── routes/          # Feature modules
│   │   ├── venues/      # Venue + Seat CRUD
│   │   ├── events/     # Event + Seat allocation
│   │   ├── tickets/    # Ticket types
│   │   └── orders/     # Order + reservation
│   └── shared/          # Error classes
├── openapi.json         # Hand-maintained Swagger spec
├── Dockerfile          # Multi-stage production build
├── Dockerfile.dev     # Development with hot reload
├── docker-compose.yml  # Production stack
├── docker-compose.dev.yml
├── README.md         # Full project docs
├── CLAUDE.md        # Codebase reference
└── turbo.json      # Turborepo config
```

---

## API Endpoints Summary

### Venues `/venues`

- POST, GET, PATCH, DELETE venues
- Seat management endpoints

### Events `/events`

- POST, GET, PATCH, DELETE events
- Seat allocation endpoints
- Status summary

### Tickets `/events/:eventId/tickets`

- CRUD for ticket types

### Orders `/orders`

- Create/reserve workflow
- Confirm/cancel workflow

---

## Key Technical Decisions

1. **Database**: PostgreSQL + TypeORM (migrations only, no sync)
2. **API Spec**: Hand-maintained OpenAPI 3.0 JSON
3. **Validation**: Joi schemas per module
4. **Error Handling**: Custom error classes + global filter
5. **Logging**: Activity ID tracking per request
6. **Concurrency**: Pessimistic locking + transactions

---

## Gaps

- Authentication layer
- Automated expiry job (cron)
- Payment integration
