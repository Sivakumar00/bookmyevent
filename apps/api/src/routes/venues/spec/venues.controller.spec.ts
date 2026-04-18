import { Test, TestingModule } from '@nestjs/testing';
import { VenuesController } from '../venues.controller';
import { VenuesService } from '../venues.service';
import { ApiResponse, PaginatedResponse } from '../../../common/base-response';
import { describe, jest, beforeEach, it, expect } from '@jest/globals';

describe('VenuesController', () => {
  let controller: VenuesController;
  let service: VenuesService;

  const mockVenue = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Venue',
    location: 'Test Location',
    capacity: 100,
    createdAt: new Date(),
  } as any;

  const mockVenuesService = {
    create: jest.fn().mockResolvedValue(mockVenue as never),
    findAll: jest
      .fn()
      .mockResolvedValue({ data: [mockVenue], total: 1 } as never),
    findOne: jest.fn().mockResolvedValue(mockVenue as never),
    update: jest
      .fn()
      .mockResolvedValue({ ...mockVenue, name: 'Updated' } as never),
    remove: jest.fn().mockResolvedValue(undefined as never),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        {
          provide: VenuesService,
          useValue: mockVenuesService,
        },
      ],
    }).compile();

    controller = module.get<VenuesController>(VenuesController);
    service = module.get<VenuesService>(VenuesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a venue', async () => {
      const createDto = { name: 'Test', location: 'Location', capacity: 100 };
      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toBeInstanceOf(ApiResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated venues', async () => {
      const result = await controller.findAll({ skip: 0, take: 10 });

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(PaginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return venue by id', async () => {
      const result = await controller.findOne('123');

      expect(service.findOne).toHaveBeenCalledWith('123');
      expect(result).toBeInstanceOf(ApiResponse);
    });
  });

  describe('update', () => {
    it('should update a venue', async () => {
      const mockRequest = { body: { name: 'Updated' } } as never;
      const result = await controller.update('123', mockRequest);

      expect(result).toBeInstanceOf(ApiResponse);
    });
  });

  describe('remove', () => {
    it('should remove a venue', async () => {
      const result = await controller.remove('123');

      expect(service.remove).toHaveBeenCalledWith('123');
      expect(result).toBeInstanceOf(ApiResponse);
    });
  });
});
