import Joi from 'joi';

const bookingItemSchema = Joi.object({
  ticketId: Joi.string().uuid().required().messages({
    'string.guid': 'Ticket ID must be a valid UUID',
    'any.required': 'Ticket ID is required',
  }),
  quantity: Joi.number().required().integer().min(1).messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
});

export const createBookingSchema = Joi.object({
  userEmail: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'any.required': 'User email is required',
  }),
  items: Joi.array()
    .items(bookingItemSchema)
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one booking item is required',
      'any.required': 'Items are required',
      'array.max': 'Maximum of 10 booking items allowed',
    }),
}).unknown(true);

export const updateBookingSchema = Joi.object({
  status: Joi.string().valid('RESERVED', 'CONFIRMED', 'CANCELLED').messages({
    'string.valid': 'Status must be RESERVED, CONFIRMED, or CANCELLED',
  }),
}).unknown(true);
