import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VenuesService } from '../venues.service';
import { Venue } from '../../../entities/venue.entity';
import { NotFoundError } from '../../../shared/errors';
import { PaginationQueryDto, SortOrder } from '../../../common/pagination.dto';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('VenuesService', () => {
  let service: VenuesService;

  const mockVenue: Venue = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Venue',
    location: 'Test Location',
    capacity: 100,
    createdAt: new Date(),
    events: [],
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
        VenuesService,
        {
          provide: getRepositoryToken(Venue),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new venue', async () => {
      const createDto = {
        name: 'New Venue',
        location: 'Location',
        capacity: 50,
      };
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockResolvedValue({
        ...createDto,
        id: '123',
      } as never);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated venues', async () => {
      const pagination: PaginationQueryDto = {
        skip: 0,
        take: 10,
        sortOrder: SortOrder.DESC,
        sortBy: 'createdAt',
      };
      const mockData = [mockVenue];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockData, 1] as never),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(pagination);

      expect(result).toEqual({ data: mockData, total: 1 });
    });
  });

  describe('findOne', () => {
    it('should return venue by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockVenue as never);

      const result = await service.findOne(mockVenue.id);

      expect(result).toEqual(mockVenue);
    });

    it('should throw NotFoundError if venue not found', async () => {
      mockRepository.findOne.mockResolvedValue(null as never);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update a venue', async () => {
      const updateDto = { name: 'Updated Name' };
      mockRepository.findOne.mockResolvedValue(mockVenue as never);
      mockRepository.save.mockResolvedValue({
        ...mockVenue,
        ...updateDto,
      } as never);

      const result = await service.update(mockVenue.id, updateDto);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove a venue', async () => {
      mockRepository.findOne.mockResolvedValue(mockVenue as never);
      mockRepository.remove.mockResolvedValue(mockVenue as never);

      await service.remove(mockVenue.id);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockVenue);
    });
  });
});
