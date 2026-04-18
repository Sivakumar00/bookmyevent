import Joi from 'joi';

export const createTicketSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
  type: Joi.string().required().min(1).messages({
    'string.empty': 'Ticket type is required',
    'any.required': 'Ticket type is required',
  }),
  price: Joi.number().required().positive().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be positive',
    'any.required': 'Price is required',
  }),
  totalQuantity: Joi.number().required().integer().min(1).messages({
    'number.base': 'Total quantity must be a number',
    'number.integer': 'Total quantity must be an integer',
    'number.min': 'Total quantity must be at least 1',
    'any.required': 'Total quantity is required',
  }),
  availableQuantity: Joi.number().integer().min(0).optional(),
}).unknown(true);

export const updateTicketSchema = Joi.object({
  type: Joi.string().min(1).messages({
    'string.empty': 'Ticket type cannot be empty',
  }),
  price: Joi.number().positive().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be positive',
  }),
  totalQuantity: Joi.number().integer().min(1).messages({
    'number.base': 'Total quantity must be a number',
    'number.integer': 'Total quantity must be an integer',
    'number.min': 'Total quantity must be at least 1',
  }),
  availableQuantity: Joi.number().integer().min(0).messages({
    'number.base': 'Available quantity must be a number',
    'number.integer': 'Available quantity must be an integer',
    'number.min': 'Available quantity cannot be negative',
  }),
})
  .min(1)
  .unknown(true);
