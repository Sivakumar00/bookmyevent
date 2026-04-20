import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrdersService } from '../orders.service';
import { Order } from '../../../entities/order.entity';
import { OrderItem } from '../../../entities/order-item.entity';
import {
  EventSeat,
  EventSeatStatus,
} from '../../../entities/event-seat.entity';
import { Event } from '../../../entities/event.entity';
import { Ticket } from '../../../entities/ticket.entity';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../shared/errors';

const ORDER_ID = '880e8400-e29b-41d4-a716-446655440000';
const EVENT_ID = '660e8400-e29b-41d4-a716-446655440000';
const SEAT_ID_1 = 'cc0e8400-e29b-41d4-a716-446655440000';
const SEAT_ID_2 = 'cc0e8400-e29b-41d4-a716-446655440001';
const TICKET_ID = '770e8400-e29b-41d4-a716-446655440000';

const mockSeat = (id: string): Partial<EventSeat> => ({
  id,
  eventId: EVENT_ID,
  seatId: `seat-${id}`,
  ticketId: TICKET_ID,
  status: EventSeatStatus.AVAILABLE,
  expiresAt: null,
});

const mockOrderItem = (eventSeatId: string): Partial<OrderItem> => ({
  id: `item-${eventSeatId}`,
  orderId: ORDER_ID,
  eventSeatId,
  priceAtPurchase: 150,
});

const mockOrder: Partial<Order> = {
  id: ORDER_ID,
  userEmail: 'user@example.com',
  totalAmount: 300,
  status: 'RESERVED',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [mockOrderItem(SEAT_ID_1) as OrderItem],
};

const mockQbSeats = (seats: any[]): any => ({
  setLock: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(seats as never),
  getOne: jest.fn().mockResolvedValue(seats[0] as never),
});

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined as never),
  startTransaction: jest.fn().mockResolvedValue(undefined as never),
  commitTransaction: jest.fn().mockResolvedValue(undefined as never),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined as never),
  release: jest.fn().mockResolvedValue(undefined as never),
  manager: {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined as never),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockOrderRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0] as never),
  })),
};

const mockOrderItemRepo = { create: jest.fn(), save: jest.fn() };
const mockEventSeatRepo = {};
const mockEventRepo = { findOne: jest.fn() };
const mockTicketRepo = {};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(EventSeat), useValue: mockEventSeatRepo },
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();

    // Default query runner setup
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
      mockQbSeats([mockSeat(SEAT_ID_1)]),
    );
    mockQueryRunner.manager.findOne.mockResolvedValue({
      id: TICKET_ID,
      price: 150,
    } as never);
    mockQueryRunner.manager.save
      .mockResolvedValueOnce({
        ...mockSeat(SEAT_ID_1),
        status: EventSeatStatus.RESERVED,
      } as never)
      .mockResolvedValueOnce({
        id: ORDER_ID,
        userEmail: 'user@example.com',
      } as never)
      .mockResolvedValue(undefined as never);
    mockEventRepo.findOne.mockResolvedValue({
      id: EVENT_ID,
      status: 'PUBLISHED',
    } as never);
    mockOrderItemRepo.create.mockImplementation((dto: any) => dto);
    mockOrderRepo.create.mockReturnValue(mockOrder);
    mockOrderRepo.findOne.mockResolvedValue(mockOrder as never);
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('reserves seats and creates order', async () => {
      const dto = {
        userEmail: 'user@example.com',
        eventId: EVENT_ID,
        seatIds: [SEAT_ID_1],
      };

      await service.create(dto);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('throws ConflictError for duplicate seatIds in request', async () => {
      const dto = {
        userEmail: 'user@example.com',
        eventId: EVENT_ID,
        seatIds: [SEAT_ID_1, SEAT_ID_1],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictError);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws ConflictError when seats are not available', async () => {
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQbSeats([]),
      );

      const dto = {
        userEmail: 'user@example.com',
        eventId: EVENT_ID,
        seatIds: [SEAT_ID_1],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictError);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestError when event is cancelled', async () => {
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQbSeats([mockSeat(SEAT_ID_1)]),
      );
      mockEventRepo.findOne.mockResolvedValue({
        id: EVENT_ID,
        status: 'CANCELLED',
      } as never);

      const dto = {
        userEmail: 'user@example.com',
        eventId: EVENT_ID,
        seatIds: [SEAT_ID_1],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestError);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('rolls back transaction on unexpected error', async () => {
      // Reset the queued resolved values set by beforeEach so the rejection fires first
      mockQueryRunner.manager.save.mockReset();
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('DB error') as never,
      );

      const dto = {
        userEmail: 'user@example.com',
        eventId: EVENT_ID,
        seatIds: [SEAT_ID_1],
      };

      await expect(service.create(dto)).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns order with items', async () => {
      mockOrderRepo.findOne.mockResolvedValue(mockOrder as never);

      const result = await service.findOne(ORDER_ID);

      expect(mockOrderRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ORDER_ID },
          relations: expect.arrayContaining(['items']),
        }),
      );
      expect(result).toEqual(mockOrder);
    });

    it('throws NotFoundError when order does not exist', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null as never);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── confirm ─────────────────────────────────────────────────────────────

  describe('confirm', () => {
    it('confirms a RESERVED order and marks seats as BOOKED', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder } as never);
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQbSeats([mockSeat(SEAT_ID_1)]),
      );
      mockQueryRunner.manager.save.mockResolvedValue(undefined as never);
      mockOrderRepo.save.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
      } as never);

      await service.confirm(ORDER_ID);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestError when order is already confirmed', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
      } as never);
      await expect(service.confirm(ORDER_ID)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when order is cancelled', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: 'CANCELLED',
      } as never);
      await expect(service.confirm(ORDER_ID)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when order has expired', async () => {
      const expiredOrder = {
        ...mockOrder,
        status: 'RESERVED',
        expiresAt: new Date(Date.now() - 1000),
        items: [mockOrderItem(SEAT_ID_1)],
      };
      mockOrderRepo.findOne.mockResolvedValue(expiredOrder as never);
      mockOrderRepo.save.mockResolvedValue({
        ...expiredOrder,
        status: 'EXPIRED',
      } as never);
      mockQueryRunner.manager.update.mockResolvedValue(undefined as never);

      await expect(service.confirm(ORDER_ID)).rejects.toThrow(BadRequestError);
    });
  });

  // ─── cancel ──────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancels a RESERVED order and releases seats', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        items: [mockOrderItem(SEAT_ID_1)],
      } as never);
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQbSeats([mockSeat(SEAT_ID_1)]),
      );
      mockQueryRunner.manager.save.mockResolvedValue(undefined as never);
      mockQueryRunner.manager.update.mockResolvedValue(undefined as never);

      await service.cancel(ORDER_ID);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestError when order is already confirmed', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
      } as never);
      await expect(service.cancel(ORDER_ID)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when order is already cancelled', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: 'CANCELLED',
      } as never);
      await expect(service.cancel(ORDER_ID)).rejects.toThrow(BadRequestError);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a RESERVED order and releases seats', async () => {
      const reservedOrder = {
        ...mockOrder,
        status: 'RESERVED',
        items: [mockOrderItem(SEAT_ID_1)],
      };
      mockOrderRepo.findOne.mockResolvedValue(reservedOrder as never);
      mockQueryRunner.manager.update.mockResolvedValue(undefined as never);
      mockOrderRepo.remove.mockResolvedValue(undefined as never);

      await service.remove(ORDER_ID);

      expect(mockOrderRepo.remove).toHaveBeenCalled();
    });

    it('throws BadRequestError when trying to delete a CONFIRMED order', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
      } as never);
      await expect(service.remove(ORDER_ID)).rejects.toThrow(BadRequestError);
    });
  });
});
