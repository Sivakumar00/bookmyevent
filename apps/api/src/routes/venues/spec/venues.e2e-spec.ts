/**
 * Venues E2E tests
 * Requires a running PostgreSQL instance (uses the same DB_* env vars as the app).
 * Each suite creates its own data and cleans up in afterAll.
 */
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app/app.module';
import { AppErrorFilter } from '../../../common/app-error.filter';

const RUN = `v-${Date.now()}`;

async function bootstrapApp(): Promise<{
  app: INestApplication;
  ds: DataSource;
}> {
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

describe('Venues (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let venueId: string;
  const VENUE_NAME = `E2E Venue ${RUN}`;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
  });

  afterAll(async () => {
    if (ds) {
      await ds.query(`DELETE FROM venues WHERE name LIKE 'E2E Venue ${RUN}%'`);
    }
    await app?.close();
  });

  // ─── POST /venues ─────────────────────────────────────────────────────────

  describe('POST /venues', () => {
    it('creates a venue and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .send({ name: VENUE_NAME, location: 'Test City', capacity: 200 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(VENUE_NAME);
      expect(res.body.data.id).toBeDefined();
      venueId = res.body.data.id;
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .send({ name: VENUE_NAME });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid capacity', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .send({ name: `${VENUE_NAME}-x`, location: 'City', capacity: 0 });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /venues ──────────────────────────────────────────────────────────

  describe('GET /venues', () => {
    it('returns 200 with paginated list', async () => {
      const res = await request(app.getHttpServer()).get('/venues?take=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters by search term', async () => {
      const res = await request(app.getHttpServer()).get(
        `/venues?search=${encodeURIComponent(RUN)}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain(RUN);
    });
  });

  // ─── GET /venues/:id ──────────────────────────────────────────────────────

  describe('GET /venues/:id', () => {
    it('returns the venue', async () => {
      const res = await request(app.getHttpServer()).get(`/venues/${venueId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(venueId);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer()).get(
        '/venues/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /venues/:id ───────────────────────────────────────────────────

  describe('PATCH /venues/:id', () => {
    it('updates venue fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/venues/${venueId}`)
        .send({ capacity: 300 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(300);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/venues/00000000-0000-0000-0000-000000000000')
        .send({ capacity: 100 });

      expect(res.status).toBe(404);
    });
  });

  // ─── Seat sub-resources ───────────────────────────────────────────────────

  describe('POST /venues/:id/seats', () => {
    it('creates a single seat', async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'A', number: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.row).toBe('A');
      expect(res.body.data.number).toBe(1);
    });

    it('returns 400 for duplicate seat', async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'A', number: 1 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /venues/:id/seats/bulk', () => {
    it('bulk creates seats', async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats/bulk`)
        .send({ rows: ['B', 'C'], startNumber: 1, endNumber: 5 });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('seats created');
    });
  });

  describe('GET /venues/:id/seats', () => {
    it('returns paginated seats for venue', async () => {
      const res = await request(app.getHttpServer()).get(
        `/venues/${venueId}/seats`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── DELETE /venues/:id ───────────────────────────────────────────────────

  describe('DELETE /venues/:id', () => {
    it('deletes venue when it has no events', async () => {
      // Create a fresh venue just for deletion
      const createRes = await request(app.getHttpServer())
        .post('/venues')
        .send({ name: `${VENUE_NAME}-del`, location: 'City', capacity: 50 });

      const id = createRes.body.data.id;
      const res = await request(app.getHttpServer()).delete(`/venues/${id}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/venues/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });
});
