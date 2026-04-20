import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import Joi from 'joi';
import { BadRequestError } from '../shared/errors';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: Joi.ObjectSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const { error, value: validatedValue } = this.schema.validate(value);
    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new BadRequestError(errorMessage);
    }
    return validatedValue;
  }
}
