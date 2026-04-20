import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';
import { ApiResponse, PaginatedResponse } from '../base-response';

describe('ApiResponse', () => {
  it('should create response with data', () => {
    const data = { id: '1', name: 'Test' };
    const response = new ApiResponse(data);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.message).toBeUndefined();
  });

  it('should create response with data and message', () => {
    const data = { id: '1' };
    const response = new ApiResponse(data, 'Success message');

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.message).toBe('Success message');
  });
});

describe('PaginatedResponse', () => {
  it('should create paginated response', () => {
    const data = [{ id: '1', name: 'Test' }];
    const response = new PaginatedResponse(data, 0, 10, 1);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.pagination.skip).toBe(0);
    expect(response.pagination.take).toBe(10);
    expect(response.pagination.total).toBe(1);
  });

  it('should handle empty data', () => {
    const response = new PaginatedResponse([], 0, 10, 0);

    expect(response.data).toEqual([]);
    expect(response.pagination.total).toBe(0);
  });
});
