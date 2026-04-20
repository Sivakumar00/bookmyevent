import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';
import { PaginationQueryDto, SortOrder } from '../pagination.dto';

describe('PaginationQueryDto', () => {
  it('should have default values', () => {
    const dto = new PaginationQueryDto();
    expect(dto.skip).toBe(0);
    expect(dto.take).toBe(50);
    expect(dto.sortOrder).toBe(SortOrder.DESC);
  });

  it('should accept custom values', () => {
    const dto = new PaginationQueryDto();
    dto.skip = 10;
    dto.take = 20;
    dto.sortOrder = SortOrder.ASC;
    dto.sortBy = 'name';
    dto.search = 'test';

    expect(dto.skip).toBe(10);
    expect(dto.take).toBe(20);
    expect(dto.sortOrder).toBe(SortOrder.ASC);
    expect(dto.sortBy).toBe('name');
    expect(dto.search).toBe('test');
  });
});

describe('SortOrder', () => {
  it('should have ASC and DESC values', () => {
    expect(SortOrder.ASC).toBe('ASC');
    expect(SortOrder.DESC).toBe('DESC');
  });
});
