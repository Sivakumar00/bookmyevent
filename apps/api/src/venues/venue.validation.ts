import Joi from 'joi';

export const createVenueSchema = Joi.object({
  name: Joi.string().required().min(1).max(255).messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
    'string.max': 'Name must not exceed 255 characters',
  }),
  location: Joi.string().required().min(1).messages({
    'string.empty': 'Location is required',
    'any.required': 'Location is required',
  }),
  capacity: Joi.number().required().integer().min(1).messages({
    'number.base': 'Capacity must be a number',
    'number.integer': 'Capacity must be an integer',
    'number.min': 'Capacity must be at least 1',
    'any.required': 'Capacity is required',
  }),
}).unknown(true);

export const updateVenueSchema = Joi.object({
  name: Joi.string().min(1).max(255).messages({
    'string.max': 'Name must not exceed 255 characters',
  }),
  location: Joi.string().min(1).messages({
    'string.empty': 'Location cannot be empty',
  }),
  capacity: Joi.number().integer().min(1).messages({
    'number.base': 'Capacity must be a number',
    'number.integer': 'Capacity must be an integer',
    'number.min': 'Capacity must be at least 1',
  }),
})
  .min(1)
  .unknown(true);
