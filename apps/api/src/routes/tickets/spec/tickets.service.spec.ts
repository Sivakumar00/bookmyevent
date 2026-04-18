import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketsService } from '../tickets.service';
import { Ticket } from '../../../entities/ticket.entity';
import { NotFoundError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';

describe('TicketsService', () => {
  let service: TicketsService;

  const mockTicket = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    eventId: '123e4567-e89b-12d3-a456-426614174001',
    type: 'VIP' as const,
    price: 100,
    totalQuantity: 50,
    availableQuantity: 30,
    createdAt: new Date(),
    event: {} as never,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ticket', async () => {
      const createDto = {
        eventId: '123',
        type: 'VIP' as const,
        price: 100,
        totalQuantity: 50,
        availableQuantity: 50,
      };
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockResolvedValue({
        ...createDto,
        id: '123',
      } as never);

      await service.create(createDto as never);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated tickets', async () => {
      const pagination: PaginationQueryDto = {
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      };
      const mockTickets = [mockTicket];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTickets, 1] as never),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(pagination);

      expect(result).toEqual({ data: mockTickets, total: 1 });
    });
  });

  describe('findOne', () => {
    it('should return ticket by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockTicket as never);

      const result = await service.findOne(mockTicket.id);

      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundError if ticket not found', async () => {
      mockRepository.findOne.mockResolvedValue(null as never);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update a ticket', async () => {
      const updateDto = { price: 150 };
      mockRepository.findOne.mockResolvedValue(mockTicket as never);
      mockRepository.save.mockResolvedValue({
        ...mockTicket,
        ...updateDto,
      } as never);

      const result = await service.update(mockTicket.id, updateDto);

      expect(result.price).toBe(150);
    });
  });

  describe('remove', () => {
    it('should remove a ticket', async () => {
      mockRepository.findOne.mockResolvedValue(mockTicket as never);
      mockRepository.remove.mockResolvedValue(mockTicket as never);

      await service.remove(mockTicket.id);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockTicket);
    });
  });
});
