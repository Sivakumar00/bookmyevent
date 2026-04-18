import 'reflect-metadata';
import { CreateVenueDto, UpdateVenueDto } from '../venues.dto';
import { describe, expect, it } from '@jest/globals';

describe('VenueDto', () => {
  describe('CreateVenueDto', () => {
    it('should have required properties', () => {
      const dto = new CreateVenueDto();
      dto.name = 'Test Venue';
      dto.location = 'Test Location';
      dto.capacity = 100;

      expect(dto.name).toBe('Test Venue');
      expect(dto.location).toBe('Test Location');
      expect(dto.capacity).toBe(100);
    });
  });

  describe('UpdateVenueDto', () => {
    it('should allow partial updates', () => {
      const dto = new UpdateVenueDto();
      dto.name = 'Updated Name';

      expect(dto.name).toBe('Updated Name');
    });

    it('should allow empty update', () => {
      const dto = new UpdateVenueDto();

      expect(dto.name).toBeUndefined();
    });
  });
});
