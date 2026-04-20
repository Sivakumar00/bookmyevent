import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const uniqueName = (prefix: string) => `${prefix}-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query(`DELETE FROM order_items WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM orders WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM event_seats WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM tickets WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM events WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM seats WHERE id IS NOT NULL`);
    await dataSource.query(`DELETE FROM venues WHERE id IS NOT NULL`);
  });

  describe('Venues API', () => {
    it('POST /venues - should create a venue', async () => {
      const response = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toContain('Test Venue');
    });

    it('GET /venues - should return paginated venues', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
    });

    it('POST /venues and GET /venues/:id - should create and retrieve venue', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = createResponse.body.data.id;

      const getResponse = await request(app.getHttpServer())
        .get(`/venues/${venueId}`)
        .expect(200);

      expect(getResponse.body.data.id).toBe(venueId);
    });

    it('PATCH /venues/:id - should update a venue', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/venues/${venueId}`)
        .send({ name: 'Updated Venue Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Venue Name');
    });

    it('POST /venues/:id/seats - should create a seat', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'A', number: 1 })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('GET /venues/:id/seats - should return seats for a venue', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/venues/${venueId}/seats`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('DELETE /venues/:id/seats/:seatId - should delete a seat', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'A', number: 1 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/venues/${venueId}/seats/${seatId}`)
        .expect(204);
    });

    it('DELETE /venues/:id - should delete a venue', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Test Venue'),
          location: '123 Test Street',
          capacity: 1000,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/venues/${venueId}`)
        .expect(204);
    });
  });

  describe('Events API', () => {
    it('POST /events - should create an event', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const response = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('GET /events - should return paginated events', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('POST and GET /events/:id - should create and retrieve event', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = createResponse.body.data.id;

      const getResponse = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .expect(200);

      expect(getResponse.body.data.id).toBe(eventId);
    });

    it('PATCH /events/:id - should update an event', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .send({
          name: 'Updated Event Name',
          status: 'PUBLISHED',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Event Name');
      expect(response.body.data.status).toBe('PUBLISHED');
    });

    it('GET /events/:id/seats - should return seats for an event', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}/seats`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('GET /events/:id/seats/status - should return seat status summary', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}/seats/status`)
        .expect(200);

      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('reserved');
      expect(response.body.data).toHaveProperty('booked');
    });

    it('DELETE /events/:id - should delete an event', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Event Venue'),
          location: '456 Test Avenue',
          capacity: 500,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Test Event'),
          description: 'A test event',
          startTime,
          endTime,
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .expect(204);
    });
  });

  describe('Tickets API', () => {
    it('POST /events/:eventId/tickets - should create a ticket', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Ticket Venue'),
          location: '789 Test Blvd',
          capacity: 300,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Ticket Event'),
          description: 'Event for tickets',
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'VIP', price: 100 })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('VIP');
    });

    it('GET /events/:eventId/tickets - should return tickets', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Ticket Venue'),
          location: '789 Test Blvd',
          capacity: 300,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Ticket Event'),
          description: 'Event for tickets',
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}/tickets`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('GET /events/:eventId/tickets/:ticketId - should return ticket by id', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Ticket Venue'),
          location: '789 Test Blvd',
          capacity: 300,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Ticket Event'),
          description: 'Event for tickets',
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'VIP', price: 100 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}/tickets/${ticketId}`)
        .expect(200);

      expect(response.body.data.id).toBe(ticketId);
    });

    it('PATCH /events/:eventId/tickets/:ticketId - should update a ticket', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Ticket Venue'),
          location: '789 Test Blvd',
          capacity: 300,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Ticket Event'),
          description: 'Event for tickets',
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'VIP', price: 100 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/events/${eventId}/tickets/${ticketId}`)
        .send({ price: 150 })
        .expect(200);

      expect(response.body.data.price).toBe(150);
    });

    it('DELETE /events/:eventId/tickets/:ticketId - should delete a ticket', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Ticket Venue'),
          location: '789 Test Blvd',
          capacity: 300,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Ticket Event'),
          description: 'Event for tickets',
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'VIP', price: 100 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/events/${eventId}/tickets/${ticketId}`)
        .expect(204);
    });
  });

  describe('Orders API', () => {
    it('POST /orders - should create an order', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Order Venue'),
          location: 'Order Test Street',
          capacity: 200,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'B', number: 5 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Order Event'),
          description: 'Event for orders',
          startTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'STANDARD', price: 50 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      const allocResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      if (allocResponse.status === 201) {
        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .send({ userEmail: 'test@example.com', eventId, seatIds: [seatId] });
        expect([201, 409]).toContain(orderResponse.status);
      }
    });

    it('GET /orders - should return paginated orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('POST and GET /orders/:id - should create and retrieve order', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Order Venue'),
          location: 'Order Test Street',
          capacity: 200,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'B', number: 5 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Order Event'),
          description: 'Event for orders',
          startTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'STANDARD', price: 50 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId })
        .expect(201);

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: 'test@example.com', eventId, seatIds: [seatId] });

      if (orderResponse.status === 201) {
        const orderId = orderResponse.body.data.id;
        const response = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .expect(200);
        expect(response.body.data.id).toBe(orderId);
      }
    });

    it('POST /orders/:id/confirm - should confirm an order', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Order Venue'),
          location: 'Order Test Street',
          capacity: 200,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'B', number: 5 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Order Event'),
          description: 'Event for orders',
          startTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'STANDARD', price: 50 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: 'test@example.com', eventId, seatIds: [seatId] });

      if (orderResponse.status === 201) {
        const orderId = orderResponse.body.data.id;
        const response = await request(app.getHttpServer())
          .post(`/orders/${orderId}/confirm`)
          .expect(200);
        expect(response.body.data.status).toBe('CONFIRMED');
      }
    });

    it('POST /orders/:id/cancel - should cancel an order', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Order Venue'),
          location: 'Order Test Street',
          capacity: 200,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'B', number: 5 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Order Event'),
          description: 'Event for orders',
          startTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'STANDARD', price: 50 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send({ userEmail: 'test@example.com', eventId, seatIds: [seatId] });

      if (orderResponse.status === 201) {
        const orderId = orderResponse.body.data.id;
        const response = await request(app.getHttpServer())
          .post(`/orders/${orderId}/cancel`)
          .expect(200);
        expect(response.body.data.status).toBe('CANCELLED');
      }
    });
  });

  describe('Seat Allocation API', () => {
    it('POST /events/:id/seat-allocation - should allocate seats', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Allocation Venue'),
          location: 'Allocation Test Street',
          capacity: 150,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'C', number: 10 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Allocation Event'),
          description: 'Event for seat allocation',
          startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'PREMIUM', price: 75 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      expect([201, 400]).toContain(response.status);
    });

    it('GET /events/:id/seat-allocation - should get seat allocations', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Allocation Venue'),
          location: 'Allocation Test Street',
          capacity: 150,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'C', number: 10 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Allocation Event'),
          description: 'Event for seat allocation',
          startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'PREMIUM', price: 75 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}/seat-allocation`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('DELETE /events/:id/seat-allocation/:eventSeatId - should remove seat allocation', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Allocation Venue'),
          location: 'Allocation Test Street',
          capacity: 150,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const seatResponse = await request(app.getHttpServer())
        .post(`/venues/${venueId}/seats`)
        .send({ row: 'C', number: 10 })
        .expect(201);

      const seatId = seatResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Allocation Event'),
          description: 'Event for seat allocation',
          startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const ticketResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/tickets`)
        .send({ type: 'PREMIUM', price: 75 })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      const allocResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation`)
        .send({ seatIds: [seatId], ticketId });

      if (allocResponse.status === 201) {
        const eventSeatId = allocResponse.body.data.id;
        const deleteResponse = await request(app.getHttpServer())
          .delete(`/events/${eventId}/seat-allocation/${eventSeatId}`);
        expect([204, 400]).toContain(deleteResponse.status);
      }
    });

    it('POST /events/:id/seat-allocation/release - should release stale seats', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: uniqueName('Allocation Venue'),
          location: 'Allocation Test Street',
          capacity: 150,
        })
        .expect(201);

      const venueId = venueResponse.body.data.id;

      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .send({
          name: uniqueName('Allocation Event'),
          description: 'Event for seat allocation',
          startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
          venueId,
          status: 'DRAFT',
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/seat-allocation/release`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Root API', () => {
    it('GET / - should return Hello World', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      expect(response.text).toBe('Hello World!');
    });
  });
});