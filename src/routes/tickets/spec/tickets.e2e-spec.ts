/**
 * Tickets E2E tests — requires a running PostgreSQL instance.
 */
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app/app.module';
import { AppErrorFilter } from '../../../common/app-error.filter';

const RUN = `tk-${Date.now()}`;

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

describe('Tickets (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  let venueId: string;
  let eventId: string;
  let seatId: string;
  let ticketId: string;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());

    const v = await request(app.getHttpServer())
      .post('/venues')
      .send({ name: `E2E Venue ${RUN}`, location: 'City', capacity: 100 });
    venueId = v.body.data.id;

    await request(app.getHttpServer())
      .post(`/venues/${venueId}/seats`)
      .send({ row: 'A', number: 1 });

    const sRes = await request(app.getHttpServer()).get(
      `/venues/${venueId}/seats`,
    );
    seatId = sRes.body.data[0].id;

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
  });

  afterAll(async () => {
    if (ds) {
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

  // ─── POST /events/:eventId/tickets ────────────────────────────────────────

  describe('POST /events/:eventId/tickets', () => {
    it('creates a ticket type for the event', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'Regular', price: 75 });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('Regular');
      expect(res.body.data.eventId).toBe(eventId);
    });

    it('returns 404 when event does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/events/00000000-0000-0000-0000-000000000000/tickets')
        .send({ type: 'VIP', price: 100 });

      expect(res.status).toBe(404);
    });

    it('returns 400 for missing price', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'VIP' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative price', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'Economy', price: -10 });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /events/:eventId/tickets ────────────────────────────────────────

  describe('GET /events/:eventId/tickets', () => {
    it('returns paginated ticket list for event', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/tickets`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters by search term', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/tickets?search=VIP`,
      );

      expect(res.status).toBe(200);
      res.body.data.forEach((t: any) =>
        expect(t.type.toLowerCase()).toContain('vip'),
      );
    });

    it('returns 404 when event does not exist', async () => {
      const res = await request(app.getHttpServer()).get(
        '/events/00000000-0000-0000-0000-000000000000/tickets',
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /events/:eventId/tickets/:ticketId ───────────────────────────────

  describe('GET /events/:eventId/tickets/:ticketId', () => {
    it('returns the ticket', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/tickets/${ticketId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ticketId);
    });

    it('returns 404 for unknown ticket', async () => {
      const res = await request(app.getHttpServer()).get(
        `/events/${eventId}/tickets/00000000-0000-0000-0000-000000000000`,
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /events/:eventId/tickets/:ticketId ────────────────────────────

  describe('PATCH /events/:eventId/tickets/:ticketId', () => {
    it('updates ticket price', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/${eventId}/tickets/${ticketId}`)
        .send({ price: 200 });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.price)).toBe(200);
    });

    it('returns 400 for empty body', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/${eventId}/tickets/${ticketId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown ticket', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/events/${eventId}/tickets/00000000-0000-0000-0000-000000000000`,
        )
        .send({ price: 100 });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /events/:eventId/tickets/:ticketId ───────────────────────────

  describe('DELETE /events/:eventId/tickets/:ticketId', () => {
    it('returns 400 when ticket has allocated seats', async () => {
      // Allocate the seat to the VIP ticket
      await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      const res = await request(app.getHttpServer()).delete(
        `/events/${eventId}/tickets/${ticketId}`,
      );

      expect(res.status).toBe(400);
    });

    it('deletes ticket when no seats are allocated', async () => {
      // Create a disposable ticket
      const t = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'Disposable', price: 1 });

      const res = await request(app.getHttpServer()).delete(
        `/events/${eventId}/tickets/${t.body.data.id}`,
      );

      expect(res.status).toBe(204);
    });
  });
});
