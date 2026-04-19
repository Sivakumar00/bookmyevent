/**
 * Booking Flow — Integration Test
 *
 * Tests the complete seat-based ticketing lifecycle end-to-end through the HTTP
 * layer against a real database. Covers the full system flow described in CLAUDE.md:
 *
 *   Venue → Seats → Event → Ticket → Allocate → Reserve → Confirm
 *   Venue → Seats → Event → Ticket → Allocate → Reserve → Cancel
 *   Double booking prevention
 *   Seat status transitions at each step
 *
 * Requires a running PostgreSQL instance with the same DB_* env vars as the app.
 */
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app/app.module';
import { AppErrorFilter } from '../../../common/app-error.filter';

const RUN = `flow-${Date.now()}`;
const USER_A = `user-a-${RUN}@example.com`;
const USER_B = `user-b-${RUN}@example.com`;

async function bootstrapApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new AppErrorFilter());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  await app.init();

  return { app, ds: app.get(DataSource) };
}

async function getSeatsStatus(app: INestApplication, eventId: string) {
  const res = await request(app.getHttpServer()).get(
    `/events/${eventId}/seats/status`,
  );
  return res.body.data as {
    totalSeats: number;
    available: number;
    reserved: number;
    booked: number;
  };
}

describe('Booking Flow (integration)', () => {
  let app: INestApplication;
  let ds: DataSource;

  // Shared state built in beforeAll
  let venueId: string;
  let eventId: string;
  let vipTicketId: string;
  let regularTicketId: string;
  let vipSeatIds: string[]; // eventSeat IDs for VIP seats
  let regularSeatIds: string[]; // eventSeat IDs for Regular seats

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());

    // ── 1. Create venue ──────────────────────────────────────────────────────
    const venue = await request(app.getHttpServer())
      .post('/venues')
      .send({
        name: `Integration Venue ${RUN}`,
        location: 'Test City',
        capacity: 20,
      });

    expect(venue.status).toBe(201);
    venueId = venue.body.data.id;

    // ── 2. Bulk create seats ─────────────────────────────────────────────────
    //    Row A: seats 1-5 → VIP
    //    Row B: seats 1-5 → Regular
    const bulkVip = await request(app.getHttpServer())
      .post(`/venues/${venueId}/seats/bulk`)
      .send({ rows: ['A'], startNumber: 1, endNumber: 5 });
    expect(bulkVip.status).toBe(201);

    const bulkReg = await request(app.getHttpServer())
      .post(`/venues/${venueId}/seats/bulk`)
      .send({ rows: ['B'], startNumber: 1, endNumber: 5 });
    expect(bulkReg.status).toBe(201);

    const seatsRes = await request(app.getHttpServer()).get(
      `/venues/${venueId}/seats`,
    );
    const allSeats: { id: string; row: string }[] = seatsRes.body.data;
    const rowAIds = allSeats.filter((s) => s.row === 'A').map((s) => s.id);
    const rowBIds = allSeats.filter((s) => s.row === 'B').map((s) => s.id);

    // ── 3. Create event ──────────────────────────────────────────────────────
    const event = await request(app.getHttpServer())
      .post('/events')
      .send({
        name: `Integration Event ${RUN}`,
        description: 'Integration test event',
        startTime: '2027-06-15T18:00:00Z',
        endTime: '2027-06-15T22:00:00Z',
        venueId,
      });

    expect(event.status).toBe(201);
    expect(event.body.data.status).toBe('DRAFT');
    eventId = event.body.data.id;

    // ── 4. Create ticket types ───────────────────────────────────────────────
    const vip = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .send({ type: 'VIP', price: 200 });
    expect(vip.status).toBe(201);
    vipTicketId = vip.body.data.id;

    const regular = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .send({ type: 'Regular', price: 80 });
    expect(regular.status).toBe(201);
    regularTicketId = regular.body.data.id;

    // ── 5. Allocate seats to ticket types ────────────────────────────────────
    const allocVip = await request(app.getHttpServer())
      .post(`/events/${eventId}/seat-allocation`)
      .send({ seatIds: rowAIds, ticketId: vipTicketId });
    expect(allocVip.status).toBe(201);
    vipSeatIds = allocVip.body.data.map((es: any) => es.id);

    const allocReg = await request(app.getHttpServer())
      .post(`/events/${eventId}/seat-allocation`)
      .send({ seatIds: rowBIds, ticketId: regularTicketId });
    expect(allocReg.status).toBe(201);
    regularSeatIds = allocReg.body.data.map((es: any) => es.id);

    // Publish the event
    await request(app.getHttpServer())
      .patch(`/events/${eventId}`)
      .send({ status: 'PUBLISHED' });
  });

  afterAll(async () => {
    if (ds) {
      await ds.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_email IN ($1, $2))`,
        [USER_A, USER_B],
      );
      await ds.query(`DELETE FROM orders WHERE user_email IN ($1, $2)`, [
        USER_A,
        USER_B,
      ]);
      await ds.query(
        `DELETE FROM event_seats WHERE event_id IN (SELECT id FROM events WHERE name LIKE '%${RUN}%')`,
      );
      await ds.query(
        `DELETE FROM tickets WHERE event_id IN (SELECT id FROM events WHERE name LIKE '%${RUN}%')`,
      );
      await ds.query(`DELETE FROM events WHERE name LIKE '%${RUN}%'`);
      await ds.query(
        `DELETE FROM seats WHERE venue_id IN (SELECT id FROM venues WHERE name LIKE '%${RUN}%')`,
      );
      await ds.query(`DELETE FROM venues WHERE name LIKE '%${RUN}%'`);
    }
    await app?.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 1: Happy path — reserve then confirm
  // ─────────────────────────────────────────────────────────────────────────

  describe('Scenario 1: Reserve → Confirm', () => {
    let orderId: string;

    it('step 1: all seats start as AVAILABLE', async () => {
      const status = await getSeatsStatus(app, eventId);
      expect(status.totalSeats).toBe(10);
      expect(status.available).toBe(10);
      expect(status.reserved).toBe(0);
      expect(status.booked).toBe(0);
    });

    it('step 2: user A reserves 2 VIP seats', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userEmail: USER_A,
          eventId,
          seatIds: [vipSeatIds[0], vipSeatIds[1]],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('RESERVED');
      expect(res.body.data.totalAmount).toBe('400.00');
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.items).toHaveLength(2);
      orderId = res.body.data.id;
    });

    it('step 3: reserved seats are shown in status', async () => {
      const status = await getSeatsStatus(app, eventId);
      expect(status.reserved).toBe(2);
      expect(status.available).toBe(8);
    });

    it('step 4: reserved seats appear in the per-seat list', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats?status=RESERVED`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].seat.row).toBe('A');
    });

    it('step 5: user A confirms the order', async () => {
      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/confirm`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('step 6: confirmed seats are BOOKED', async () => {
      const status = await getSeatsStatus(app, eventId);
      expect(status.booked).toBe(2);
      expect(status.reserved).toBe(0);
      expect(status.available).toBe(8);
    });

    it('step 7: order detail shows correct items', async () => {
      const res = await request(app.getHttpServer()).get(`/orders/${orderId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].eventSeat.seat).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 2: Reserve → Cancel (seats released)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Scenario 2: Reserve → Cancel', () => {
    let orderId: string;

    it('step 1: user B reserves 2 Regular seats', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userEmail: USER_B,
          eventId,
          seatIds: [regularSeatIds[0], regularSeatIds[1]],
        });

      expect(res.status).toBe(201);
      orderId = res.body.data.id;

      const status = await getSeatsStatus(app, eventId);
      expect(status.reserved).toBe(2);
    });

    it('step 2: user B cancels the order', async () => {
      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/cancel`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('step 3: seats are returned to AVAILABLE after cancellation', async () => {
      const status = await getSeatsStatus(app, eventId);
      expect(status.reserved).toBe(0);
      // 2 VIP booked from scenario 1 + 8 available
      expect(status.booked).toBe(2);
      expect(status.available).toBe(8);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 3: Double booking prevention
  // ─────────────────────────────────────────────────────────────────────────

  describe('Scenario 3: Double booking prevention', () => {
    it('two concurrent requests for the same seat: only one succeeds', async () => {
      // Pick a seat that is currently AVAILABLE
      const targetSeat = regularSeatIds[2];

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/orders')
          .send({ userEmail: USER_A, eventId, seatIds: [targetSeat] }),
        request(app.getHttpServer())
          .post('/orders')
          .send({ userEmail: USER_B, eventId, seatIds: [targetSeat] }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      // Cancel whichever one succeeded to leave state clean
      const successRes = res1.status === 201 ? res1 : res2;
      await request(app.getHttpServer()).post(
        `/orders/${successRes.body.data.id}/cancel`,
      );
    });

    it('cannot reserve an already-BOOKED seat', async () => {
      // vipSeatIds[0] and [1] are BOOKED from Scenario 1
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_B, eventId, seatIds: [vipSeatIds[0]] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 4: Validation guards
  // ─────────────────────────────────────────────────────────────────────────

  describe('Scenario 4: Validation guards', () => {
    it('cannot allocate a ticket that belongs to a different event', async () => {
      // Create another event and its ticket
      const otherEvent = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `Other Event ${RUN}`,
          description: 'Other',
          startTime: '2027-09-01T18:00:00Z',
          endTime: '2027-09-01T22:00:00Z',
          venueId,
        });

      const otherTicket = await request(app.getHttpServer())
        .post(`/events/${otherEvent.body.data.id}/tickets`)
        .send({ type: 'General', price: 50 });

      // Try to allocate a seat using the foreign ticket
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({
          seatIds: [regularSeatIds[4]],
          ticketId: otherTicket.body.data.id,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('cannot confirm an already-cancelled order', async () => {
      const order = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_A, eventId, seatIds: [regularSeatIds[3]] });

      const orderId = order.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/cancel`);

      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/confirm`,
      );

      expect(res.status).toBe(400);
    });

    it('cannot cancel an already-confirmed order', async () => {
      const order = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_B, eventId, seatIds: [regularSeatIds[3]] });

      const orderId = order.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`);

      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/cancel`,
      );

      expect(res.status).toBe(400);
    });

    it('cannot delete a CONFIRMED order', async () => {
      const order = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_A, eventId, seatIds: [regularSeatIds[4]] });

      const orderId = order.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`);

      const res = await request(app.getHttpServer()).delete(
        `/orders/${orderId}`,
      );

      expect(res.status).toBe(400);
    });
  });
});
