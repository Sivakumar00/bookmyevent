import Joi from 'joi';

export const createOrderSchema = Joi.object({
  userEmail: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'any.required': 'User email is required',
  }),
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
  seatIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one seat must be selected',
    'any.required': 'Seat IDs are required',
  }),
}).unknown(true);

export const updateOrderSchema = Joi.object({
  status: Joi.string().valid('RESERVED', 'CONFIRMED', 'CANCELLED').messages({
    'string.valid': 'Status must be RESERVED, CONFIRMED, or CANCELLED',
  }),
}).unknown(true);
