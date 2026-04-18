import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from '../events.service';
import { Event } from '../../../entities/event.entity';
import { Venue } from '../../../entities/venue.entity';
import { Ticket } from '../../../entities/ticket.entity';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';

describe('EventsService', () => {
  let service: EventsService;

  const mockEvent: Event = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Event',
    description: 'Test Description',
    startTime: new Date(),
    endTime: new Date(),
    venueId: '123e4567-e89b-12d3-a456-426614174001',
    status: 'DRAFT',
    createdAt: new Date(),
    venue: {} as never,
    tickets: [],
  };

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockEvent, 1] as never),
    })),
    remove: jest.fn(),
  };

  const mockVenueRepository = {
    findOne: jest.fn(),
  };

  const mockTicketRepository = {
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
        { provide: getRepositoryToken(Venue), useValue: mockVenueRepository },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepository },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createDto = {
        name: 'New Event',
        description: 'Description',
        startTime: new Date(),
        endTime: new Date(),
        venueId: '123',
      };
      mockVenueRepository.findOne.mockResolvedValue({ id: '123' });
      mockEventRepository.create.mockReturnValue(createDto);
      mockEventRepository.save.mockResolvedValue({ ...createDto, id: '123' });

      const result = await service.create(createDto as never);

      expect(mockVenueRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(mockEventRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockEventRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError if venue not found', async () => {
      const createDto = {
        name: 'New Event',
        description: 'Description',
        startTime: new Date(),
        endTime: new Date(),
        venueId: '123',
      };
      mockVenueRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto as never)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated events', async () => {
      const pagination: PaginationQueryDto = {
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      };

      const result = await service.findAll(pagination);

      expect(result).toEqual({ data: mockEvent, total: 1 });
    });
  });

  describe('findOne', () => {
    it('should return event by id', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne(mockEvent.id);

      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundError if event not found', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const updateDto = { name: 'Updated Name' };
      mockEventRepository.findOne.mockResolvedValue(mockEvent as never);
      mockEventRepository.save.mockResolvedValue({
        ...mockEvent,
        ...updateDto,
      } as never);

      const result = await service.update(mockEvent.id, updateDto as never);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove an event', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent as never);
      mockEventRepository.remove.mockResolvedValue(mockEvent as never);

      await service.remove(mockEvent.id);

      expect(mockEventRepository.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw BadRequestError if event has booked tickets', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent as never);
      mockTicketRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      });

      await expect(service.remove(mockEvent.id)).rejects.toThrow(
        BadRequestError,
      );
    });
  });
});
