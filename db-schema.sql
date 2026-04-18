-- BookMyEvent Database Schema
-- PostgreSQL

-- ============================================
-- VENUES
-- ============================================
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_status ON events(status);

-- ============================================
-- TICKETS
-- ============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    price DECIMAL(10,2) NOT NULL,
    total_quantity INT NOT NULL,
    available_quantity INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_event_id ON tickets(event_id);

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    total_amount DECIMAL(10,2) NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user_email ON bookings(user_email);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- BOOKING ITEMS
-- ============================================
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_ticket_id ON booking_items(ticket_id);

-- ============================================
-- SEAT ALLOCATIONS (Reserved Seating)
-- ============================================
CREATE TABLE seat_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section VARCHAR(50),
    row VARCHAR(10),
    seat_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    price DECIMAL(10,2),
    reserved_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_seat UNIQUE (event_id, seat_number)
);

CREATE INDEX idx_seat_allocations_event_id ON seat_allocations(event_id);
CREATE INDEX idx_seat_allocations_status ON seat_allocations(status);
CREATE INDEX idx_seat_allocations_reserved_until ON seat_allocations(reserved_until);

-- ============================================
-- RELATIONSHIPS SUMMARY
-- ============================================
/*
venues 1--< events
events 1--< tickets
events 1--< seat_allocations
bookings 1--< booking_items
tickets 1--< booking_items
*/

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample venue
INSERT INTO venues (id, name, location, capacity)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Convention Center', '123 Main Street, City', 500);

-- Insert sample event
INSERT INTO events (id, name, description, start_time, end_time, venue_id, status)
VALUES (
    '660e8400-e29b-41d4-a716-446655440000',
    'Summer Concert 2026',
    'The biggest summer concert of the year',
    '2026-06-15 18:00:00'::timestamp,
    '2026-06-15 23:00:00'::timestamp,
    '550e8400-e29b-41d4-a716-446655440000',
    'PUBLISHED'
);

-- Insert sample tickets
INSERT INTO tickets (id, event_id, type, price, total_quantity, available_quantity)
VALUES
    ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'VIP', 150.00, 100, 100),
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'REGULAR', 50.00, 200, 200);

-- Insert sample seats
INSERT INTO seat_allocations (event_id, section, row, seat_number, status, price)
SELECT
    '660e8400-e29b-41d4-a716-446655440000',
    'A',
    r::text,
    'A' || r::text || s::text,
    'AVAILABLE',
    100.00
FROM generate_series(1, 5) AS r
CROSS JOIN generate_series(1, 10) AS s;

-- Insert sample booking
INSERT INTO bookings (id, user_email, status, total_amount, expires_at)
VALUES (
    '880e8400-e29b-41d4-a716-446655440000',
    'user@example.com',
    'RESERVED',
    300.00,
    CURRENT_TIMESTAMP + INTERVAL '30 minutes'
);

-- Insert booking item
INSERT INTO booking_items (id, booking_id, ticket_id, quantity, price_at_purchase)
VALUES (
    '990e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440000',
    2,
    150.00
);