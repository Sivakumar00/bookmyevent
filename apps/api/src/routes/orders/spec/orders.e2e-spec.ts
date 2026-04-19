/**
 * Orders E2E tests — requires a running PostgreSQL instance.
 */
import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app/app.module';
import { AppErrorFilter } from '../../../common/app-error.filter';

const RUN = `or-${Date.now()}`;
const USER_EMAIL = `test-${RUN}@example.com`;

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

/** Reset all event seats in the test event back to AVAILABLE for isolation. */
async function resetSeats(ds: DataSource, eventId: string) {
  await ds.query(
    `UPDATE event_seats SET status = 'AVAILABLE', expires_at = NULL WHERE event_id = $1`,
    [eventId],
  );
}

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  let venueId: string;
  let eventId: string;
  let ticketId: string;
  let eventSeatIds: string[] = [];

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());

    // Venue
    const v = await request(app.getHttpServer())
      .post('/venues')
      .send({ name: `E2E Venue ${RUN}`, location: 'City', capacity: 100 });
    venueId = v.body.data.id;

    // Seats
    await request(app.getHttpServer())
      .post(`/venues/${venueId}/seats/bulk`)
      .send({ rows: ['A'], startNumber: 1, endNumber: 5 });

    const sRes = await request(app.getHttpServer()).get(
      `/venues/${venueId}/seats`,
    );
    const seatIds: string[] = sRes.body.data.map((s: any) => s.id);

    // Event
    const e = await request(app.getHttpServer())
      .post('/events')
      .send({
        name: `E2E Event ${RUN}`,
        description: 'Test',
        startTime: '2027-01-01T18:00:00Z',
        endTime: '2027-01-01T22:00:00Z',
        venueId,
      });
    eventId = e.body.data.id;

    // Ticket
    const t = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .send({ type: 'VIP', price: 150 });
    ticketId = t.body.data.id;

    // Allocate all seats to the ticket
    const a = await request(app.getHttpServer())
      .post(`/events/${eventId}/seat-allocation`)
      .send({ seatIds, ticketId });
    eventSeatIds = a.body.data.map((es: any) => es.id);
  });

  afterAll(async () => {
    if (ds) {
      await ds.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_email = $1)`,
        [USER_EMAIL],
      );
      await ds.query(`DELETE FROM orders WHERE user_email = $1`, [USER_EMAIL]);
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

  beforeEach(async () => {
    // Return all seats to AVAILABLE so each test starts clean
    await resetSeats(ds, eventId);
    // Delete any orders from previous tests
    await ds.query(
      `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_email = $1)`,
      [USER_EMAIL],
    );
    await ds.query(`DELETE FROM orders WHERE user_email = $1`, [USER_EMAIL]);
  });

  // ─── POST /orders ─────────────────────────────────────────────────────────

  describe('POST /orders', () => {
    it('reserves seats and creates a RESERVED order', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('RESERVED');
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.items).toHaveLength(1);
    });

    it('returns 409 when seat is already reserved', async () => {
      // First reservation
      await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      // Second attempt for same seat
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 for duplicate seatIds in the same request', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userEmail: USER_EMAIL,
          eventId,
          seatIds: [eventSeatIds[0], eventSeatIds[0]],
        });

      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userEmail: 'not-an-email',
          eventId,
          seatIds: [eventSeatIds[0]],
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when event is cancelled', async () => {
      // Cancel the event
      await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .send({ status: 'CANCELLED' });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      // Restore event status
      await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /orders ──────────────────────────────────────────────────────────

  describe('GET /orders', () => {
    it('returns paginated order list', async () => {
      const res = await request(app.getHttpServer()).get('/orders?take=5');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ─── GET /orders/:id ──────────────────────────────────────────────────────

  describe('GET /orders/:id', () => {
    it('returns order with items and seat detail', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      const orderId = create.body.data.id;
      const res = await request(app.getHttpServer()).get(`/orders/${orderId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data.items).toBeDefined();
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer()).get(
        '/orders/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /orders/:id/confirm ─────────────────────────────────────────────

  describe('POST /orders/:id/confirm', () => {
    it('confirms order and marks seats as BOOKED', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[0]] });

      const orderId = create.body.data.id;
      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/confirm`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');

      // Verify seat is now BOOKED
      const seats = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats?status=BOOKED`,
      );
      expect(seats.body.data.length).toBeGreaterThan(0);
    });

    it('returns 400 when order is already confirmed', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[1]] });

      const orderId = create.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`);

      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/confirm`,
      );

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /orders/:id/cancel ──────────────────────────────────────────────

  describe('POST /orders/:id/cancel', () => {
    it('cancels order and releases seats back to AVAILABLE', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[2]] });

      const orderId = create.body.data.id;
      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/cancel`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      // The seat should be available again
      const seats = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats?status=AVAILABLE`,
      );
      const freed = seats.body.data.find((s: any) => s.id === eventSeatIds[2]);
      expect(freed).toBeDefined();
    });

    it('returns 400 when trying to cancel a confirmed order', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[3]] });

      const orderId = create.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`);

      const res = await request(app.getHttpServer()).post(
        `/orders/${orderId}/cancel`,
      );

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE /orders/:id ───────────────────────────────────────────────────

  describe('DELETE /orders/:id', () => {
    it('deletes a RESERVED order and releases seats', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[4]] });

      const orderId = create.body.data.id;
      const res = await request(app.getHttpServer()).delete(
        `/orders/${orderId}`,
      );

      expect(res.status).toBe(204);
    });

    it('returns 400 when trying to delete a CONFIRMED order', async () => {
      const create = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: USER_EMAIL, eventId, seatIds: [eventSeatIds[4]] });

      const orderId = create.body.data.id;
      await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`);

      const res = await request(app.getHttpServer()).delete(
        `/orders/${orderId}`,
      );

      expect(res.status).toBe(400);
    });
  });
});
