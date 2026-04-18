import Joi from 'joi';

export const createSeatAllocationSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
  section: Joi.string().optional(),
  row: Joi.string().optional(),
  seatNumber: Joi.string().required().messages({
    'any.required': 'Seat number is required',
  }),
  price: Joi.number().optional().min(0),
}).unknown(true);

export const createBulkSeatAllocationSchema = Joi.object({
  eventId: Joi.string().uuid().required().messages({
    'string.guid': 'Event ID must be a valid UUID',
    'any.required': 'Event ID is required',
  }),
  section: Joi.string().required().messages({
    'any.required': 'Section is required',
  }),
  rows: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one row is required',
    'any.required': 'Rows are required',
  }),
  seatsPerRow: Joi.number().integer().min(1).required().messages({
    'number.integer': 'Seats per row must be an integer',
    'number.min': 'Seats per row must be at least 1',
    'any.required': 'Seats per row is required',
  }),
  price: Joi.number().optional().min(0),
}).unknown(true);

export const updateSeatAllocationSchema = Joi.object({
  section: Joi.string().optional(),
  row: Joi.string().optional(),
  seatNumber: Joi.string().optional(),
  status: Joi.string().valid('AVAILABLE', 'RESERVED', 'BOOKED').messages({
    'string.valid': 'Status must be AVAILABLE, RESERVED, or BOOKED',
  }),
  price: Joi.number().optional().min(0),
}).unknown(true);

export const lockSeatsSchema = Joi.object({
  seatIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one seat ID is required',
    'any.required': 'Seat IDs are required',
  }),
}).unknown(true);

export const bookSeatsSchema = Joi.object({
  seatIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one seat ID is required',
    'any.required': 'Seat IDs are required',
  }),
}).unknown(true);

export const releaseSeatsSchema = Joi.object({
  seatIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one seat ID is required',
    'any.required': 'Seat IDs are required',
  }),
}).unknown(true);
