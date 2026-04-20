import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { VenuesService } from '../venues.service';
import { Venue } from '../../../entities/venue.entity';
import { Seat } from '../../../entities/seat.entity';
import { Event } from '../../../entities/event.entity';
import {
  EventSeat,
  EventSeatStatus,
} from '../../../entities/event-seat.entity';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';

const VENUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const SEAT_ID = 'aa0e8400-e29b-41d4-a716-446655440000';

const mockVenue: Venue = {
  id: VENUE_ID,
  name: 'Test Venue',
  location: 'Test Location',
  capacity: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  events: [],
  seats: [],
};

const mockSeat: Seat = {
  id: SEAT_ID,
  venueId: VENUE_ID,
  row: 'A',
  number: 1,
  venue: mockVenue as Venue,
  eventSeats: [],
};

const makeQb = (overrides: Record<string, any> = {}) => ({
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(null as never),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  onConflict: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({} as never),
  ...overrides,
});

const mockVenueRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
};

const mockSeatRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
};

const mockEventRepo = {
  createQueryBuilder: jest.fn(() => makeQb()),
};

const mockEventSeatRepo = {
  findOne: jest.fn(),
};

describe('VenuesService', () => {
  let service: VenuesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        { provide: getRepositoryToken(Venue), useValue: mockVenueRepo },
        { provide: getRepositoryToken(Seat), useValue: mockSeatRepo },
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(EventSeat), useValue: mockEventSeatRepo },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns venue', async () => {
      mockVenueRepo.create.mockReturnValue(mockVenue);
      mockVenueRepo.save.mockResolvedValue(mockVenue as never);

      const result = await service.create({
        name: 'Test Venue',
        location: 'Loc',
        capacity: 100,
      });

      expect(mockVenueRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockVenue);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated venues', async () => {
      const qb = makeQb({
        getManyAndCount: jest.fn().mockResolvedValue([[mockVenue], 1] as never),
      });
      mockVenueRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      });

      expect(result).toEqual({ data: [mockVenue], total: 1 });
    });

    it('applies search filter when provided', async () => {
      const qb = makeQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
      });
      mockVenueRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        skip: 0,
        take: 10,
        search: 'hall',
      } as PaginationQueryDto);

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%hall%' }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns venue when found', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      expect(await service.findOne(VENUE_ID)).toEqual(mockVenue);
    });

    it('throws NotFoundError when venue does not exist', async () => {
      mockVenueRepo.findOne.mockResolvedValue(null as never);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns venue', async () => {
      mockVenueRepo.findOne.mockResolvedValue({ ...mockVenue } as never);
      mockVenueRepo.save.mockResolvedValue({
        ...mockVenue,
        name: 'Updated',
      } as never);

      const result = await service.update(VENUE_ID, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundError if venue does not exist', async () => {
      mockVenueRepo.findOne.mockResolvedValue(null as never);
      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes venue when it has no events', async () => {
      // innerJoin query returns null → no events
      mockVenueRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: jest.fn().mockResolvedValue(null as never) }),
      );
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockVenueRepo.remove.mockResolvedValue(undefined as never);

      await service.remove(VENUE_ID);

      expect(mockVenueRepo.remove).toHaveBeenCalledWith(mockVenue);
    });

    it('throws BadRequestError when venue has events', async () => {
      mockVenueRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getOne: jest.fn().mockResolvedValue({
            id: VENUE_ID,
            events: [{ id: '1' }],
          } as never),
        }),
      );

      await expect(service.remove(VENUE_ID)).rejects.toThrow(BadRequestError);
    });
  });

  // ─── createSeat ──────────────────────────────────────────────────────────

  describe('createSeat', () => {
    it('creates a seat for the venue', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockSeatRepo.findOne.mockResolvedValue(null as never);
      mockSeatRepo.create.mockReturnValue(mockSeat);
      mockSeatRepo.save.mockResolvedValue(mockSeat as never);

      const result = await service.createSeat(VENUE_ID, {
        row: 'A',
        number: 1,
      });

      expect(result).toEqual(mockSeat);
    });

    it('throws BadRequestError if seat already exists', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockSeatRepo.findOne.mockResolvedValue(mockSeat as never);

      await expect(
        service.createSeat(VENUE_ID, { row: 'A', number: 1 }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ─── createBulkSeats ─────────────────────────────────────────────────────

  describe('createBulkSeats', () => {
    it('bulk inserts seats ignoring duplicates', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      const qb = makeQb();
      mockSeatRepo.createQueryBuilder.mockReturnValue(qb);

      await service.createBulkSeats(VENUE_ID, {
        rows: ['A', 'B'],
        startNumber: 1,
        endNumber: 5,
      });

      expect(qb.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ row: 'A', number: 1 }),
          expect.objectContaining({ row: 'B', number: 5 }),
        ]),
      );
    });
  });

  // ─── removeSeat ──────────────────────────────────────────────────────────

  describe('removeSeat', () => {
    it('removes seat when not booked', async () => {
      mockSeatRepo.findOne.mockResolvedValue(mockSeat as never);
      mockEventSeatRepo.findOne.mockResolvedValue(null as never);
      mockSeatRepo.remove.mockResolvedValue(undefined as never);

      await service.removeSeat(VENUE_ID, SEAT_ID);

      expect(mockSeatRepo.remove).toHaveBeenCalledWith(mockSeat);
    });

    it('throws NotFoundError if seat does not belong to venue', async () => {
      mockSeatRepo.findOne.mockResolvedValue(null as never);
      await expect(service.removeSeat(VENUE_ID, SEAT_ID)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws BadRequestError if seat has active bookings', async () => {
      mockSeatRepo.findOne.mockResolvedValue(mockSeat as never);
      mockEventSeatRepo.findOne.mockResolvedValue({
        status: EventSeatStatus.BOOKED,
      } as never);

      await expect(service.removeSeat(VENUE_ID, SEAT_ID)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  // ─── removeBulkSeats ─────────────────────────────────────────────────────

  describe('removeBulkSeats', () => {
    it('deletes seats by IDs', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockSeatRepo.delete.mockResolvedValue({ affected: 1 } as never);

      await service.removeBulkSeats(VENUE_ID, [SEAT_ID]);

      expect(mockSeatRepo.delete).toHaveBeenCalledWith([SEAT_ID]);
    });

    it('throws BadRequestError on FK constraint violation', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockSeatRepo.delete.mockRejectedValue({ code: '23503' } as never);

      await expect(
        service.removeBulkSeats(VENUE_ID, [SEAT_ID]),
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ─── getSeats ────────────────────────────────────────────────────────────

  describe('getSeats', () => {
    it('returns paginated seats for venue', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      mockSeatRepo.findAndCount.mockResolvedValue([[mockSeat], 1] as never);

      const result = await service.getSeats(VENUE_ID, {
        skip: 0,
        take: 10,
      } as PaginationQueryDto);

      expect(result).toEqual({ data: [mockSeat], total: 1 });
    });
  });

  // ─── getEvents ───────────────────────────────────────────────────────────

  describe('getEvents', () => {
    it('returns paginated events for venue', async () => {
      mockVenueRepo.findOne.mockResolvedValue(mockVenue as never);
      const qb = makeQb({
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[{ id: '1', name: 'Event' }], 1] as never),
      });
      mockEventRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getEvents(VENUE_ID, {
        skip: 0,
        take: 10,
      } as PaginationQueryDto);

      expect(result.total).toBe(1);
    });
  });
});
