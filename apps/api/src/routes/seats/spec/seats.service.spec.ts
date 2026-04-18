import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatsService } from '../seats.service';
import {
  EventSeat,
  EventSeatStatus,
} from '../../../entities/event-seat.entity';
import { Event } from '../../../entities/event.entity';
import { Seat } from '../../../entities/seat.entity';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';

describe('SeatsService', () => {
  let service: SeatsService;

  const mockEventSeat: EventSeat = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    eventId: '123e4567-e89b-12d3-a456-426614174001',
    seatId: '123e4567-e89b-12d3-a456-426614174002',
    status: EventSeatStatus.AVAILABLE,
    event: {} as Event,
    seat: {} as Seat,
  };

  const mockEventSeatRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockEventSeat], 1]),
    })),
    remove: jest.fn(),
  };

  const mockEventRepository = {
    findOne: jest.fn(),
  };

  const mockSeatRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatsService,
        {
          provide: getRepositoryToken(EventSeat),
          useValue: mockEventSeatRepository,
        },
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
        { provide: getRepositoryToken(Seat), useValue: mockSeatRepository },
      ],
    }).compile();

    service = module.get<SeatsService>(SeatsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new event seat', async () => {
      const eventId = '123e4567-e89b-12d3-a456-426614174001';
      const seatId = '123e4567-e89b-12d3-a456-426614174002';
      const createDto = { eventId, seatId };
      mockEventRepository.findOne.mockResolvedValue({ id: eventId });
      mockSeatRepository.findOne.mockResolvedValue({ id: seatId });
      mockEventSeatRepository.findOne.mockResolvedValue(null);
      mockEventSeatRepository.create.mockReturnValue(createDto);
      mockEventSeatRepository.save.mockResolvedValue({
        ...createDto,
        id: '123',
      });

      const result = await service.create(createDto as never);

      expect(mockEventRepository.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(mockEventSeatRepository.create).toHaveBeenCalled();
      expect(mockEventSeatRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError if event not found', async () => {
      const createDto = { eventId: '123', seatId: 'seat-123' };
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto as never)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw NotFoundError if seat not found', async () => {
      const createDto = { eventId: '123', seatId: 'seat-123' };
      mockEventRepository.findOne.mockResolvedValue({ id: '123' });
      mockSeatRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto as never)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw BadRequestError if seat already allocated', async () => {
      const createDto = { eventId: '123', seatId: 'seat-123' };
      mockEventRepository.findOne.mockResolvedValue({ id: '123' });
      mockSeatRepository.findOne.mockResolvedValue({ id: 'seat-123' });
      mockEventSeatRepository.findOne.mockResolvedValue({
        eventId: '123',
        seatId: 'seat-123',
      });

      await expect(service.create(createDto as never)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('createBulk', () => {
    it('should create bulk event seats', async () => {
      const eventId = '123e4567-e89b-12d3-a456-426614174001';
      const seatIds = ['seat-1', 'seat-2'];
      mockEventRepository.findOne.mockResolvedValue({ id: eventId });
      mockSeatRepository.findOne.mockResolvedValue({ id: 'seat-1' });
      mockEventSeatRepository.findOne.mockResolvedValue(null);
      mockEventSeatRepository.save.mockResolvedValue([]);

      await service.createBulk(eventId, seatIds);

      expect(mockEventSeatRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated event seats', async () => {
      const pagination: PaginationQueryDto = {
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      };
      const mockSeats = [mockEventSeat];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockSeats, 1] as never),
      };
      mockEventSeatRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll(pagination);

      expect(result).toEqual({ data: mockSeats, total: 1 });
    });
  });

  describe('findOne', () => {
    it('should return event seat by id', async () => {
      mockEventSeatRepository.findOne.mockResolvedValue(mockEventSeat);

      const result = await service.findOne(mockEventSeat.id);

      expect(result).toEqual(mockEventSeat);
    });

    it('should throw NotFoundError if event seat not found', async () => {
      mockEventSeatRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update an event seat', async () => {
      const updateDto = { status: EventSeatStatus.RESERVED };
      mockEventSeatRepository.findOne.mockResolvedValue(mockEventSeat);
      mockEventSeatRepository.save.mockResolvedValue({
        ...mockEventSeat,
        ...updateDto,
      });

      const result = await service.update(mockEventSeat.id, updateDto);

      expect(result.status).toBe(EventSeatStatus.RESERVED);
    });

    it('should throw BadRequestError if seat is booked', async () => {
      const bookedSeat = { ...mockEventSeat, status: EventSeatStatus.BOOKED };
      const updateDto = { status: EventSeatStatus.AVAILABLE };
      mockEventSeatRepository.findOne.mockResolvedValue(bookedSeat);

      await expect(service.update(mockEventSeat.id, updateDto)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('remove', () => {
    it('should remove an available event seat', async () => {
      const availableSeat = {
        ...mockEventSeat,
        status: EventSeatStatus.AVAILABLE,
      };
      mockEventSeatRepository.findOne.mockResolvedValue(availableSeat as never);
      mockEventSeatRepository.remove.mockResolvedValue(availableSeat as never);

      await service.remove(mockEventSeat.id);

      expect(mockEventSeatRepository.remove).toHaveBeenCalledWith(
        availableSeat,
      );
    });

    it('should throw BadRequestError if seat is booked', async () => {
      const bookedSeat = { ...mockEventSeat, status: EventSeatStatus.BOOKED };
      mockEventSeatRepository.findOne.mockResolvedValue(bookedSeat as never);

      await expect(service.remove(mockEventSeat.id)).rejects.toThrow(
        BadRequestError,
      );
    });

    it('should throw BadRequestError if seat is reserved', async () => {
      const reservedSeat = {
        ...mockEventSeat,
        status: EventSeatStatus.RESERVED,
      };
      mockEventSeatRepository.findOne.mockResolvedValue(reservedSeat as never);

      await expect(service.remove(mockEventSeat.id)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('getAvailability', () => {
    it('should return seat availability counts', async () => {
      const seats = [
        { status: EventSeatStatus.AVAILABLE },
        { status: EventSeatStatus.AVAILABLE },
        { status: EventSeatStatus.RESERVED },
        { status: EventSeatStatus.BOOKED },
      ];
      mockEventSeatRepository.find.mockResolvedValue(seats as never);

      const result = await service.getAvailability('123');

      expect(result).toEqual({ available: 2, reserved: 1, booked: 1 });
    });
  });

  describe('lockSeats', () => {
    it('should lock available seats', async () => {
      const seatIds = ['seat-1', 'seat-2'];
      const availableSeats = [
        { id: 'seat-1', status: EventSeatStatus.AVAILABLE },
        { id: 'seat-2', status: EventSeatStatus.AVAILABLE },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        availableSeats as never,
      );
      mockEventSeatRepository.save.mockResolvedValue(availableSeats as never);

      const result = await service.lockSeats(seatIds);

      expect(result).toEqual(availableSeats);
    });

    it('should throw error if seat not available', async () => {
      const seatIds = ['seat-1'];
      const unavailableSeats = [
        { id: 'seat-1', status: EventSeatStatus.BOOKED },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        unavailableSeats as never,
      );

      await expect(service.lockSeats(seatIds)).rejects.toThrow(BadRequestError);
    });
  });

  describe('bookSeats', () => {
    it('should book reserved seats', async () => {
      const seatIds = ['seat-1', 'seat-2'];
      const reservedSeats = [
        { id: 'seat-1', status: EventSeatStatus.RESERVED },
        { id: 'seat-2', status: EventSeatStatus.RESERVED },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        reservedSeats as never,
      );
      mockEventSeatRepository.save.mockResolvedValue(reservedSeats as never);

      const result = await service.bookSeats(seatIds);

      expect(result).toEqual(reservedSeats);
    });

    it('should throw error if seats not reserved', async () => {
      const seatIds = ['seat-1'];
      const availableSeats = [
        { id: 'seat-1', status: EventSeatStatus.AVAILABLE },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        availableSeats as never,
      );

      await expect(service.bookSeats(seatIds)).rejects.toThrow(BadRequestError);
    });
  });

  describe('releaseSeats', () => {
    it('should release reserved seats', async () => {
      const seatIds = ['seat-1'];
      const reservedSeats = [
        { id: 'seat-1', status: EventSeatStatus.RESERVED },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        reservedSeats as never,
      );
      mockEventSeatRepository.save.mockResolvedValue(reservedSeats as never);

      const result = await service.releaseSeats(seatIds);

      expect(result).toEqual(reservedSeats);
    });

    it('should throw error if seats not reserved', async () => {
      const seatIds = ['seat-1'];
      const availableSeats = [
        { id: 'seat-1', status: EventSeatStatus.AVAILABLE },
      ];
      mockEventSeatRepository.findByIds.mockResolvedValue(
        availableSeats as never,
      );

      await expect(service.releaseSeats(seatIds)).rejects.toThrow(
        BadRequestError,
      );
    });
  });
});
