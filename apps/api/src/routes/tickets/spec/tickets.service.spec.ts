import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketsService } from '../tickets.service';
import { Ticket } from '../../../entities/ticket.entity';
import { Event } from '../../../entities/event.entity';
import { EventSeat } from '../../../entities/event-seat.entity';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';

const EVENT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TICKET_ID = '770e8400-e29b-41d4-a716-446655440000';

const mockEvent: Partial<Event> = { id: EVENT_ID, name: 'Concert' };

const mockTicket: Partial<Ticket> = {
  id: TICKET_ID,
  eventId: EVENT_ID,
  type: 'VIP',
  price: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeQb = (overrides: Record<string, any> = {}) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
  ...overrides,
});

const mockTicketRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
};

const mockEventRepo = {
  findOne: jest.fn(),
};

const mockEventSeatRepo = {
  find: jest.fn(),
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(EventSeat), useValue: mockEventSeatRepo },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates ticket for existing event', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepo.create.mockReturnValue(mockTicket);
      mockTicketRepo.save.mockResolvedValue(mockTicket as never);

      const result = await service.create(EVENT_ID, {
        type: 'VIP',
        price: 100,
      });

      expect(mockTicketRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: EVENT_ID, type: 'VIP', price: 100 }),
      );
      expect(result).toEqual(mockTicket);
    });

    it('throws NotFoundError when event does not exist', async () => {
      mockEventRepo.findOne.mockResolvedValue(null as never);

      await expect(
        service.create(EVENT_ID, { type: 'VIP', price: 100 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated tickets for event', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockTicket], 1] as never),
      });
      mockTicketRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(EVENT_ID, {
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      });

      expect(result).toEqual({ data: [mockTicket], total: 1 });
    });

    it('applies search filter when provided', async () => {
      mockEventRepo.findOne.mockResolvedValue(mockEvent as never);
      const qb = makeQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
      });
      mockTicketRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(EVENT_ID, {
        skip: 0,
        take: 10,
        search: 'vip',
      } as PaginationQueryDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%vip%' }),
      );
    });

    it('throws NotFoundError when event does not exist', async () => {
      mockEventRepo.findOne.mockResolvedValue(null as never);
      await expect(
        service.findAll(EVENT_ID, {} as PaginationQueryDto),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns ticket scoped to the event', async () => {
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);

      const result = await service.findOne(TICKET_ID, EVENT_ID);

      expect(mockTicketRepo.findOne).toHaveBeenCalledWith({
        where: { id: TICKET_ID, eventId: EVENT_ID },
      });
      expect(result).toEqual(mockTicket);
    });

    it('throws NotFoundError when ticket not found', async () => {
      mockTicketRepo.findOne.mockResolvedValue(null as never);
      await expect(service.findOne(TICKET_ID, EVENT_ID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns ticket', async () => {
      mockTicketRepo.findOne.mockResolvedValue({ ...mockTicket } as never);
      mockTicketRepo.save.mockResolvedValue({
        ...mockTicket,
        price: 200,
      } as never);

      const result = await service.update(TICKET_ID, { price: 200 }, EVENT_ID);

      expect(result.price).toBe(200);
    });

    it('throws NotFoundError when ticket does not exist', async () => {
      mockTicketRepo.findOne.mockResolvedValue(null as never);
      await expect(
        service.update(TICKET_ID, { price: 200 }, EVENT_ID),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes ticket when no seats are allocated', async () => {
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockEventSeatRepo.find.mockResolvedValue([] as never);
      mockTicketRepo.remove.mockResolvedValue(undefined as never);

      await service.remove(TICKET_ID, EVENT_ID);

      expect(mockTicketRepo.remove).toHaveBeenCalledWith(mockTicket);
    });

    it('throws BadRequestError when ticket has allocated seats', async () => {
      mockTicketRepo.findOne.mockResolvedValue(mockTicket as never);
      mockEventSeatRepo.find.mockResolvedValue([{ id: 'seat-1' }] as never);

      await expect(service.remove(TICKET_ID, EVENT_ID)).rejects.toThrow(
        BadRequestError,
      );
    });

    it('throws NotFoundError when ticket does not exist', async () => {
      mockTicketRepo.findOne.mockResolvedValue(null as never);
      await expect(service.remove(TICKET_ID, EVENT_ID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
