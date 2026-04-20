import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from '../events.service';
import { Event } from '../../../entities/event.entity';
import { Venue } from '../../../entities/venue.entity';
import { Ticket } from '../../../entities/ticket.entity';
import {
  EventSeat,
  EventSeatStatus,
} from '../../../entities/event-seat.entity';
import { Seat } from '../../../entities/seat.entity';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  UnprocessableError,
} from '../../../shared/errors';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const EVENT_ID = '660e8400-e29b-41d4-a716-446655440000';
const VENUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const TICKET_ID = '770e8400-e29b-41d4-a716-446655440000';
const SEAT_ID = 'aa0e8400-e29b-41d4-a716-446655440000';
const EVENT_SEAT_ID = 'cc0e8400-e29b-41d4-a716-446655440000';

const mockVenue: Venue = {
  id: VENUE_ID,
  name: 'Venue',
  location: 'Loc',
  capacity: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  events: [],
  seats: [],
};

const mockEvent: Event = {
  id: EVENT_ID,
  name: 'Concert',
  description: 'Desc',
  startTime: new Date(),
  endTime: new Date(),
  venueId: VENUE_ID,
  venue: mockVenue,
  status: 'DRAFT',
  createdAt: new Date(),
  updatedAt: new Date(),
  tickets: [],
  eventSeats: [],
};

const mockTicket: Ticket = {
  id: TICKET_ID,
  eventId: EVENT_ID,
  type: 'VIP',
  price: 150,
  createdAt: new Date(),
  updatedAt: new Date(),
  event: mockEvent,
  eventSeats: [],
};

const mockSeat: Seat = {
  id: SEAT_ID,
  venueId: VENUE_ID,
  row: 'A',
  number: 1,
  venue: mockVenue,
  eventSeats: [],
};

const mockEventSeat: EventSeat = {
  id: EVENT_SEAT_ID,
  eventId: EVENT_ID,
  seatId: SEAT_ID,
  ticketId: TICKET_ID,
  status: EventSeatStatus.AVAILABLE,
  expiresAt: null,
  createdAt: new Date(),
  event: mockEvent,
  seat: mockSeat,
  ticket: mockTicket,
  orderItems: [],
};

const makeQb = (overrides: Record<string, any> = {}) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
  getRawMany: jest.fn().mockResolvedValue([] as never),
  execute: jest.fn().mockResolvedValue({ affected: 0 } as never),
  ...overrides,
});

const mockEventRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
};

const mockVenueRepo = { findOne: jest.fn() };
const mockTicketRepo = { findOne: jest.fn() };
const mockSeatRepo = { findByIds: jest.fn() };
const mockEventSeatRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(Venue), useValue: mockVenueRepo },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(EventSeat), useValue: mockEventSeatRepo },
        { provide: getRepositoryToken(Seat), useValue: mockSeatRepo },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates event when venue exists', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockEventRepo.create.mockReturnValue(mockEvent);
      mockEventRepo.save.mockResolvedValue(mockEvent as never);

      const result = await service.create({
        name: 'Concert',
        description: 'Desc',
        startTime: new Date(),
        endTime: new Date(),
        venueId: VENUE_ID,
      });

      expect(result).toEqual(mockEvent);
    });

    it('throws NotFoundError when venue does not exist', async () => {
      mockVenueRepo.findOne.mockResolvedValue(null as never);

      await expect(
        service.create({
          name: 'Concert',
          description: 'Desc',
          startTime: new Date(),
          endTime: new Date(),
          venueId: 'bad',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns event when found', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      expect(await service.findOne(EVENT_ID)).toEqual(mockEvent);
    });

    it('throws NotFoundError when event does not exist', async () => {
      mockEventRepo.findOne.mockResolvedValue(null as never);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates event fields', async () => {
      mockEventRepo.findOne.mockResolvedValue({ ...mockEvent } as never);
      mockEventRepo.save.mockResolvedValue({
        ...mockEvent,
        status: 'PUBLISHED',
      } as never);

      const result = await service.update(EVENT_ID, { status: 'PUBLISHED' });

      expect(result.status).toBe('PUBLISHED');
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes event when no seats are booked', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockEventSeatRepo.count.mockResolvedValue(0 as never);
      mockEventRepo.remove.mockResolvedValue(undefined as never);

      await service.remove(EVENT_ID);

      expect(mockEventRepo.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('throws BadRequestError when event has booked seats', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockEventSeatRepo.count.mockResolvedValue(2 as never);

      await expect(service.remove(EVENT_ID)).rejects.toThrow(BadRequestError);
    });
  });

  // ─── getSeats ────────────────────────────────────────────────────────────

  describe('getSeats', () => {
    it('returns paginated event seats with relations', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockEventSeat], 1] as never),
      });
      mockEventSeatRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSeats(EVENT_ID, {
        skip: 0,
        take: 10,
      } as PaginationQueryDto);

      expect(result).toEqual({ data: [mockEventSeat], total: 1 });
    });

    it('applies status filter when provided', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
      });
      mockEventSeatRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getSeats(
        EVENT_ID,
        { skip: 0, take: 10 } as PaginationQueryDto,
        'AVAILABLE',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: 'AVAILABLE' }),
      );
    });

    it('throws BadRequestError for unknown status value', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);

      await expect(
        service.getSeats(
          EVENT_ID,
          { skip: 0, take: 10 } as PaginationQueryDto,
          'INVALID',
        ),
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ─── getSeatsStatus ──────────────────────────────────────────────────────

  describe('getSeatsStatus', () => {
    it('returns counts from GROUP BY query', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'AVAILABLE', count: '80' },
          { status: 'RESERVED', count: '10' },
          { status: 'BOOKED', count: '10' },
        ] as never),
      });
      mockEventSeatRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSeatsStatus(EVENT_ID);

      expect(result).toEqual({
        totalSeats: 100,
        available: 80,
        reserved: 10,
        booked: 10,
      });
    });

    it('defaults missing statuses to zero', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ status: 'AVAILABLE', count: '50' }] as never),
      });
      mockEventSeatRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSeatsStatus(EVENT_ID);

      expect(result).toEqual({
        totalSeats: 50,
        available: 50,
        reserved: 0,
        booked: 0,
      });
    });
  });

  // ─── allocateSeats ───────────────────────────────────────────────────────

  describe('allocateSeats', () => {
    it('allocates seats when all validations pass', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockSeatRepo.findByIds.mockResolvedValue([mockSeat] as never);
      mockEventSeatRepo.create.mockReturnValue(mockEventSeat);
      mockEventSeatRepo.save.mockResolvedValue([mockEventSeat] as never);

      const result = await service.allocateSeats(
        EVENT_ID,
        [SEAT_ID],
        TICKET_ID,
      );

      expect(result).toEqual([mockEventSeat]);
    });

    it('throws NotFoundError when ticket does not exist', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue(null as never);

      await expect(
        service.allocateSeats(EVENT_ID, [SEAT_ID], TICKET_ID),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws UnprocessableError when ticket belongs to different event', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue({
        ...mockTicket,
        eventId: 'other-event',
      } as never);

      await expect(
        service.allocateSeats(EVENT_ID, [SEAT_ID], TICKET_ID),
      ).rejects.toThrow(UnprocessableError);
    });

    it('throws NotFoundError when seat IDs not found in DB', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockSeatRepo.findByIds.mockResolvedValue([] as never);

      await expect(
        service.allocateSeats(EVENT_ID, [SEAT_ID], TICKET_ID),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws UnprocessableError when seat belongs to different venue', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockSeatRepo.findByIds.mockResolvedValue([
        { ...mockSeat, venueId: 'other-venue' },
      ] as never);

      await expect(
        service.allocateSeats(EVENT_ID, [SEAT_ID], TICKET_ID),
      ).rejects.toThrow(UnprocessableError);
    });

    it('throws ConflictError on duplicate unique constraint (23505)', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockSeatRepo.findByIds.mockResolvedValue([mockSeat] as never);
      mockEventSeatRepo.create.mockReturnValue(mockEventSeat);
      mockEventSeatRepo.save.mockRejectedValue({ code: '23505' } as never);

      await expect(
        service.allocateSeats(EVENT_ID, [SEAT_ID], TICKET_ID),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ─── getSeatAllocations ──────────────────────────────────────────────────

  describe('getSeatAllocations', () => {
    it('returns all allocations for event', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockEventSeatRepo.find.mockResolvedValue([mockEventSeat] as never);

      const result = await service.getSeatAllocations(EVENT_ID);

      expect(result).toEqual([mockEventSeat]);
    });

    it('filters by ticketId when provided', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockEventSeatRepo.find.mockResolvedValue([mockEventSeat] as never);

      await service.getSeatAllocations(EVENT_ID, TICKET_ID);

      expect(mockEventSeatRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticketId: TICKET_ID }),
        }),
      );
    });
  });

  // ─── removeSeatAllocation ────────────────────────────────────────────────

  describe('removeSeatAllocation', () => {
    it('removes an AVAILABLE allocation', async () => {
      mockEventSeatRepo.findOne.mockResolvedValue(mockEventSeat as never);
      mockEventSeatRepo.remove.mockResolvedValue(undefined as never);

      await service.removeSeatAllocation(EVENT_SEAT_ID);

      expect(mockEventSeatRepo.remove).toHaveBeenCalledWith(mockEventSeat);
    });

    it('throws NotFoundError when allocation does not exist', async () => {
      mockEventSeatRepo.findOne.mockResolvedValue(null as never);
      await expect(service.removeSeatAllocation(EVENT_SEAT_ID)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws BadRequestError when trying to remove a BOOKED allocation', async () => {
      mockEventSeatRepo.findOne.mockResolvedValue({
        ...mockEventSeat,
        status: EventSeatStatus.BOOKED,
      } as never);
      await expect(service.removeSeatAllocation(EVENT_SEAT_ID)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  // ─── releaseStaleSeats ───────────────────────────────────────────────────

  describe('releaseStaleSeats', () => {
    it('returns count of released seats', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        execute: jest.fn().mockResolvedValue({ affected: 3 } as never),
      });
      mockEventSeatRepo.createQueryBuilder.mockReturnValue(qb);

      const count = await service.releaseStaleSeats(EVENT_ID);

      expect(count).toBe(3);
    });
  });
});
