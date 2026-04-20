import Joi from 'joi';

export const createEventSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
    'string.max': 'Name must not exceed 100 characters',
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),
  startTime: Joi.date().required().messages({
    'date.base': 'Start time must be a valid date',
    'any.required': 'Start time is required',
  }),
  endTime: Joi.date().required().greater(Joi.ref('startTime')).messages({
    'date.base': 'End time must be a valid date',
    'date.greater': 'End time must be after start time',
    'any.required': 'End time is required',
  }),
  venueId: Joi.string().uuid().required().messages({
    'string.guid': 'Venue ID must be a valid UUID',
    'any.required': 'Venue ID is required',
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'CANCELLED').optional(),
}).unknown(true);

export const updateEventSchema = Joi.object({
  name: Joi.string().min(1).max(100).messages({
    'string.max': 'Name must not exceed 100 characters',
  }),
  description: Joi.string().messages({
    'string.empty': 'Description cannot be empty',
  }),
  startTime: Joi.date().messages({
    'date.base': 'Start time must be a valid date',
  }),
  endTime: Joi.date().messages({
    'date.base': 'End time must be a valid date',
  }),
  venueId: Joi.string().uuid().messages({
    'string.guid': 'Venue ID must be a valid UUID',
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'CANCELLED').messages({
    'string.valid': 'Status must be DRAFT, PUBLISHED, or CANCELLED',
  }),
})
  .min(1)
  .unknown(true);
