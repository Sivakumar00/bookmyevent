import { describe, it, expect, beforeEach } from '@jest/globals';
import Joi from 'joi';
import { JoiValidationPipe } from '../joi-validation.pipe';
import { BadRequestError } from '../../shared/errors';
import { ArgumentMetadata } from '@nestjs/common';

describe('JoiValidationPipe', () => {
  let pipe: JoiValidationPipe;
  const schema = Joi.object({
    name: Joi.string().required(),
    age: Joi.number().optional(),
  });

  beforeEach(() => {
    pipe = new JoiValidationPipe(schema);
  });

  describe('transform', () => {
    it('should validate and return value', () => {
      const value = { name: 'John', age: 25 };
      const metadata = { type: 'body' } as ArgumentMetadata;

      const result = pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should throw BadRequestError for invalid value', () => {
      const value = { age: 'not a number' };
      const metadata = { type: 'body' } as ArgumentMetadata;

      expect(() => pipe.transform(value, metadata)).toThrow(BadRequestError);
    });
  });
});
