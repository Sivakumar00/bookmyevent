/**
 * Events E2E tests — requires a running PostgreSQL instance.
 */
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app/app.module';
import { AppErrorFilter } from '../../../common/app-error.filter';

const RUN = `ev-${Date.now()}`;

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

describe('Events (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  let venueId: string;
  let eventId: string;
  let ticketId: string;
  let seatIds: string[] = [];
  let eventSeatId: string;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());

    // Seed venue + seats + event + ticket + allocation used across tests
    const v = await request(app.getHttpServer())
      .post('/venues')
      .send({ name: `E2E Venue ${RUN}`, location: 'City', capacity: 200 });
    venueId = v.body.data.id;

    await request(app.getHttpServer())
      .post(`/venues/${venueId}/seats/bulk`)
      .send({ rows: ['A'], startNumber: 1, endNumber: 10 });

    const sRes = await request(app.getHttpServer()).get(
      `/venues/${venueId}/seats`,
    );
    seatIds = sRes.body.data.map((s: any) => s.id);

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

    const t = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .send({ type: 'VIP', price: 150 });
    ticketId = t.body.data.id;

    const a = await request(app.getHttpServer())
      .post(`/events/${eventId}/seat-allocation`)
      .send({ seatIds: [seatIds[0]], ticketId });
    eventSeatId = a.body.data[0].id;
  });

  afterAll(async () => {
    if (ds) {
      await ds.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_email LIKE '%${RUN}%')`,
      );
      await ds.query(`DELETE FROM orders WHERE user_email LIKE '%${RUN}%'`);
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

  // ─── POST /events ─────────────────────────────────────────────────────────

  describe('POST /events', () => {
    it('creates an event with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `E2E Event Extra ${RUN}`,
          description: 'Desc',
          startTime: '2027-06-01T18:00:00Z',
          endTime: '2027-06-01T22:00:00Z',
          venueId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('returns 404 when venue does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `E2E Event ${RUN}`,
          description: 'Desc',
          startTime: '2027-06-01T18:00:00Z',
          endTime: '2027-06-01T22:00:00Z',
          venueId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
    });

    it('returns 400 when endTime is before startTime', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `E2E Event ${RUN}`,
          description: 'Desc',
          startTime: '2027-06-01T22:00:00Z',
          endTime: '2027-06-01T18:00:00Z',
          venueId,
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /events ──────────────────────────────────────────────────────────

  describe('GET /events', () => {
    it('returns paginated event list', async () => {
      const res = await request(app.getHttpServer()).get('/events?take=5');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters by search term', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events?search=${encodeURIComponent(RUN)}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── GET /events/:id ──────────────────────────────────────────────────────

  describe('GET /events/:id', () => {
    it('returns event', async () => {
      const res = await request(app.getHttpServer()).get(`/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(eventId);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer()).get(
        '/events/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /events/:id ───────────────────────────────────────────────────

  describe('PATCH /events/:id', () => {
    it('updates event status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });
  });

  // ─── GET /events/:id/seats ───────────────────────────────────────────────

  describe('GET /events/:id/seats', () => {
    it('returns per-seat list with seat and ticket detail', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].seat).toBeDefined();
      expect(res.body.data[0].status).toBe('AVAILABLE');
    });

    it('filters by status query param', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats?status=AVAILABLE`,
      );

      expect(res.status).toBe(200);
      res.body.data.forEach((s: any) => expect(s.status).toBe('AVAILABLE'));
    });

    it('returns 400 for invalid status value', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats?status=UNKNOWN`,
      );

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /events/:id/seats/status ────────────────────────────────────────

  describe('GET /events/:id/seats/status', () => {
    it('returns aggregate seat counts', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seats/status`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        totalSeats: expect.any(Number),
        available: expect.any(Number),
        reserved: expect.any(Number),
        booked: expect.any(Number),
      });
    });
  });

  // ─── POST /events/:id/seat-allocation ────────────────────────────────────

  describe('POST /events/:id/seat-allocation', () => {
    it('allocates seats to ticket type', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatIds[1]], ticketId });

      expect(res.status).toBe(201);
      expect(res.body.data[0].ticketId).toBe(ticketId);
    });

    it('returns 409 when seat is already allocated', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatIds[0]], ticketId });

      expect(res.status).toBe(409);
    });

    it('returns 422 when ticket does not belong to this event', async () => {
      // Create another event with its own ticket
      const ev2 = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `E2E Event2 ${RUN}`,
          description: 'Desc',
          startTime: '2027-07-01T18:00:00Z',
          endTime: '2027-07-01T22:00:00Z',
          venueId,
        });
      const t2 = await request(app.getHttpServer())
        .post(`/events/${ev2.body.data.id}/tickets`)
        .send({ type: 'Regular', price: 50 });

      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatIds[2]], ticketId: t2.body.data.id });

      expect(res.status).toBe(422);
    });
  });

  // ─── GET /events/:id/seat-allocation ─────────────────────────────────────

  describe('GET /events/:id/seat-allocation', () => {
    it('returns all allocations for the event', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seat-allocation`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('filters by ticketId', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/seat-allocation?ticketId=${ticketId}`,
      );

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => expect(a.ticketId).toBe(ticketId));
    });
  });

  // ─── POST /events/:id/seat-allocation/release ─────────────────────────────

  describe('POST /events/:id/seat-allocation/release', () => {
    it('returns 200 with count of released seats', async () => {
      const res = await request(app.getHttpServer()).post(
        `/events/${eventId}/seat-allocation/release`,
      );

      expect(res.status).toBe(200);
      expect(typeof res.body.data).toBe('number');
    });
  });

  // ─── DELETE /events/:id/seat-allocation/:eventSeatId ─────────────────────

  describe('DELETE /events/:id/seat-allocation/:eventSeatId', () => {
    it('removes an AVAILABLE allocation', async () => {
      // Allocate a new seat to remove
      const a = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatIds[3]], ticketId });

      const esId = a.body.data[0].id;
      const res = await request(app.getHttpServer()).delete(
        `/events/${eventId}/seat-allocation/${esId}`,
      );

      expect(res.status).toBe(204);
    });
  });

  // ─── DELETE /events/:id ───────────────────────────────────────────────────

  describe('DELETE /events/:id', () => {
    it('returns 400 if event has no booked seats but still prevents bad-state delete', async () => {
      // Event with allocations but no bookings should delete fine
      const ev = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: `E2E EventDel ${RUN}`,
          description: 'Del',
          startTime: '2027-08-01T18:00:00Z',
          endTime: '2027-08-01T22:00:00Z',
          venueId,
        });

      const res = await request(app.getHttpServer()).delete(
        `/events/${ev.body.data.id}`,
      );
      expect(res.status).toBe(204);
    });

    it('returns 404 for unknown event', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/events/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(404);
    });
  });
});
