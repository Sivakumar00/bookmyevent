// API Examples for Swagger documentation
// Organized by route: params, request, response

// ==================== VENUES ====================
export const venuesDoc = {
  params: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Venue UUID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    },
  },
  request: {
    create: {
      name: 'Grand Arena',
      location: '123 Main Street, Kuala Lumpur',
      capacity: 5000,
    },
    update: { name: 'Updated Grand Arena', capacity: 6000 },
  },
  response: {
    create: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Grand Arena',
        location: '123 Main Street, Kuala Lumpur',
        capacity: 5000,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      message: 'Venue created successfully',
    },
    list: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Grand Arena',
          location: '123 Main Street',
          capacity: 5000,
        },
      ],
      skip: 0,
      take: 50,
      total: 1,
    },
    get: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Grand Arena',
        location: '123 Main Street',
        capacity: 5000,
      },
    },
  },
};

// ==================== EVENTS ====================
export const eventsDoc = {
  params: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Event UUID',
      example: '123e4567-e89b-12d3-a456-426614174001',
    },
  },
  request: {
    create: {
      name: 'Concert 2024',
      description: 'Annual music concert',
      date: '2024-12-31T20:00:00Z',
      venueId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'ACTIVE',
    },
    update: { name: 'Updated Concert 2024', status: 'CANCELLED' },
  },
  response: {
    create: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Concert 2024',
        description: 'Annual music concert',
        date: '2024-12-31T20:00:00Z',
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      message: 'Event created successfully',
    },
    list: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Concert 2024',
          description: 'Annual music concert',
          date: '2024-12-31T20:00:00Z',
          venueId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'ACTIVE',
        },
      ],
      skip: 0,
      take: 50,
      total: 1,
    },
    get: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Concert 2024',
        description: 'Annual music concert',
        date: '2024-12-31T20:00:00Z',
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ACTIVE',
      },
    },
  },
};

// ==================== TICKETS ====================
export const ticketsDoc = {
  params: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Ticket UUID',
      example: '123e4567-e89b-12d3-a456-426614174002',
    },
  },
  request: {
    create: {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'VIP',
      price: 250.0,
      totalQuantity: 100,
      availableQuantity: 100,
    },
    update: { price: 300.0, availableQuantity: 80 },
  },
  response: {
    create: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'VIP',
        price: 250.0,
        totalQuantity: 100,
        availableQuantity: 100,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      message: 'Ticket created successfully',
    },
    list: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          eventId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'VIP',
          price: 250.0,
          totalQuantity: 100,
          availableQuantity: 50,
        },
      ],
      skip: 0,
      take: 50,
      total: 1,
    },
    get: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'VIP',
        price: 250.0,
        totalQuantity: 100,
        availableQuantity: 50,
      },
    },
  },
};

// ==================== ORDERS ====================
export const ordersDoc = {
  params: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Order UUID',
      example: '123e4567-e89b-12d3-a456-426614174003',
    },
  },
  request: {
    create: {
      userEmail: 'customer@example.com',
      items: [
        { ticketId: '123e4567-e89b-12d3-a456-426614174002', quantity: 2 },
      ],
    },
    update: { status: 'CONFIRMED' },
  },
  response: {
    create: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        userEmail: 'customer@example.com',
        status: 'RESERVED',
        totalAmount: 500.0,
        expiresAt: '2024-01-15T10:10:00Z',
        items: [
          {
            ticketId: '123e4567-e89b-12d3-a456-426614174002',
            quantity: 2,
            priceAtPurchase: 250.0,
          },
        ],
        createdAt: '2024-01-15T10:00:00Z',
      },
      message: 'Order reserved. Please confirm within 10 minutes.',
    },
    list: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          userEmail: 'customer@example.com',
          status: 'RESERVED',
          totalAmount: 500.0,
        },
      ],
      skip: 0,
      take: 50,
      total: 1,
    },
    get: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        userEmail: 'customer@example.com',
        status: 'RESERVED',
        totalAmount: 500.0,
        items: [
          { ticketId: '123e4567-e89b-12d3-a456-426614174002', quantity: 2 },
        ],
      },
    },
    confirm: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        userEmail: 'customer@example.com',
        status: 'CONFIRMED',
        totalAmount: 500.0,
      },
      message: 'Order confirmed successfully',
    },
    cancel: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        userEmail: 'customer@example.com',
        status: 'CANCELLED',
        totalAmount: 500.0,
      },
      message: 'Order cancelled successfully',
    },
  },
};

// ==================== SEATS ====================
export const seatsDoc = {
  params: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Event Seat UUID',
      example: '123e4567-e89b-12d3-a456-426614174011',
    },
    eventId: {
      name: 'eventId',
      type: 'string',
      description: 'Event UUID',
      example: '123e4567-e89b-12d3-a456-426614174001',
    },
  },
  request: {
    create: {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      seatId: '123e4567-e89b-12d3-a456-426614174010',
    },
    bulk: {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      seatIds: [
        '123e4567-e89b-12d3-a456-426614174010',
        '123e4567-e89b-12d3-a456-426614174011',
      ],
    },
    lock: {
      seatIds: [
        '123e4567-e89b-12d3-a456-426614174011',
        '123e4567-e89b-12d3-a456-426614174012',
      ],
    },
    book: {
      seatIds: [
        '123e4567-e89b-12d3-a456-426614174011',
        '123e4567-e89b-12d3-a456-426614174012',
      ],
    },
    release: { seatIds: ['123e4567-e89b-12d3-a456-426614174011'] },
    update: { status: 'RESERVED' },
  },
  response: {
    create: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174011',
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        seatId: '123e4567-e89b-12d3-a456-426614174010',
        status: 'AVAILABLE',
      },
      message: 'Seat created successfully',
    },
    bulk: {
      data: [
        { id: '123e4567-e89b-12d3-a456-426614174011', status: 'AVAILABLE' },
        { id: '123e4567-e89b-12d3-a456-426614174012', status: 'AVAILABLE' },
      ],
      message: '2 seats created successfully',
    },
    lock: {
      data: [
        { id: '123e4567-e89b-12d3-a456-426614174011', status: 'RESERVED' },
        { id: '123e4567-e89b-12d3-a456-426614174012', status: 'RESERVED' },
      ],
      message: 'Seats locked',
    },
    book: {
      data: [
        { id: '123e4567-e89b-12d3-a456-426614174011', status: 'BOOKED' },
        { id: '123e4567-e89b-12d3-a456-426614174012', status: 'BOOKED' },
      ],
      message: 'Seats booked successfully',
    },
    release: {
      data: [
        { id: '123e4567-e89b-12d3-a456-426614174011', status: 'AVAILABLE' },
      ],
      message: 'Seats released successfully',
    },
    list: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174011',
          eventId: '123e4567-e89b-12d3-a456-426614174001',
          seatId: '123e4567-e89b-12d3-a456-426614174010',
          status: 'AVAILABLE',
        },
      ],
      skip: 0,
      take: 50,
      total: 1,
    },
    get: {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174011',
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        seatId: '123e4567-e89b-12d3-a456-426614174010',
        status: 'AVAILABLE',
      },
    },
    availability: { data: { available: 100, reserved: 10, booked: 5 } },
  },
};

// ==================== PAGINATION ====================
export const paginationDoc = {
  query: { skip: 0, take: 50, search: 'example' },
  queryWithEventId: {
    skip: 0,
    take: 50,
    search: 'example',
    eventId: '123e4567-e89b-12d3-a456-426614174001',
  },
};

// ==================== COMMON ====================
export const commonDoc = {
  notFound: {
    statusCode: 404,
    message: 'Resource not found',
    error: 'Not Found',
  },
  badRequest: {
    statusCode: 400,
    message: 'Invalid request',
    error: 'Bad Request',
  },
  unauthorized: {
    statusCode: 401,
    message: 'Unauthorized',
    error: 'Unauthorized',
  },
};

// Export all as default for easy import
export default {
  venuesDoc,
  eventsDoc,
  ticketsDoc,
  ordersDoc,
  seatsDoc,
  paginationDoc,
  commonDoc,
};
