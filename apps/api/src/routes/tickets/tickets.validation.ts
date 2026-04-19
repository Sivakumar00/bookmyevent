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
}).unknown(true);

export const updateTicketSchema = Joi.object({
  type: Joi.string().min(1).messages({
    'string.empty': 'Ticket type cannot be empty',
  }),
  price: Joi.number().positive().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be positive',
  }),
})
  .min(1)
  .unknown(true);
