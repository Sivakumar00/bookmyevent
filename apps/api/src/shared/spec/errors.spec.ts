import { ErrorCode, AppError, NotFoundError, BadRequestError } from '../errors';

describe('Errors', () => {
  describe('ErrorCode', () => {
    it('should have correct values', () => {
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.BAD_REQUEST).toBe('BAD_REQUEST');
      expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Bad request', 400, {
        details: 'test',
      });
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NotFoundError', () => {
    it('should create error with status 404', () => {
      const error = new NotFoundError('Not found', { id: '123' });
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('BadRequestError', () => {
    it('should create error with status 400', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.statusCode).toBe(400);
    });
  });
});
