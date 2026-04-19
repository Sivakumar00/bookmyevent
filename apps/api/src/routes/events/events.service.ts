import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { EventSeat, EventSeatStatus } from '../../entities/event-seat.entity';
import { Seat } from '../../entities/seat.entity';
import { CreateEventDto, UpdateEventDto } from './events.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { Venue } from '../../entities/venue.entity';
import { Ticket } from '../../entities/ticket.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(EventSeat)
    private readonly eventSeatRepository: Repository<EventSeat>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const { venueId } = createEventDto;
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
    });
    if (!venue) {
      throw new NotFoundError(`Venue with ID "${venueId}" not found`);
    }
    const event = this.eventRepository.create(createEventDto as Event);
    return this.eventRepository.save(event);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Event[]; total: number }> {
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.eventRepository.createQueryBuilder('event');

    if (search) {
      queryBuilder.where(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy(`event.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundError(`Event with ID "${id}" not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);

    if (!event) {
      throw new NotFoundError(`Event with ID "${id}" not found`);
    }
    /**
     * Check whether the event has active bookings
     */
    const bookedTicketsCount = await this.ticketRepository
      .createQueryBuilder('ticket')
      .innerJoin('ticket.bookingItems', 'bookingItem')
      .where('ticket.eventId = :eventId', { eventId: id })
      .getCount();

    if (bookedTicketsCount > 0) {
      throw new BadRequestError('Cannot delete an event with booked tickets');
    }

    await this.eventRepository.remove(event);
  }

  async getSeatsStatus(eventId: string): Promise<{
    totalSeats: number;
    available: number;
    reserved: number;
    booked: number;
  }> {
    await this.findOne(eventId);
    const seats = await this.eventSeatRepository.find({ where: { eventId } });

    return {
      totalSeats: seats.length,
      available: seats.filter((s) => s.status === 'AVAILABLE').length,
      reserved: seats.filter((s) => s.status === 'RESERVED').length,
      booked: seats.filter((s) => s.status === 'BOOKED').length,
    };
  }

  async allocateSeats(
    eventId: string,
    seatIds: string[],
    ticketId: string,
  ): Promise<EventSeat[]> {
    await this.findOne(eventId);

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID "${ticketId}" not found`);
    }

    const seats = seatIds.map((seatId) => {
      return this.eventSeatRepository.create({
        eventId,
        seatId,
        ticketId,
        status: EventSeatStatus.AVAILABLE,
      });
    });

    try {
      return await this.eventSeatRepository.save(seats);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestError(
          'One or more seats are already allocated to this event',
        );
      }
      throw error;
    }
  }

  async getSeatAllocations(
    eventId: string,
    ticketId?: string,
  ): Promise<EventSeat[]> {
    await this.findOne(eventId);
    const where = { eventId };
    if (ticketId) {
      Object.assign(where, { ticketId });
    }
    return this.eventSeatRepository.find({
      where,
      relations: ['seat', 'ticket'],
    });
  }

  async removeSeatAllocation(eventSeatId: string): Promise<void> {
    const eventSeat = await this.eventSeatRepository.findOne({
      where: { id: eventSeatId },
    });
    if (!eventSeat) {
      throw new NotFoundError(
        `Seat allocation with ID "${eventSeatId}" not found`,
      );
    }
    if (eventSeat.status === EventSeatStatus.BOOKED) {
      throw new BadRequestError('Cannot remove a booked seat allocation');
    }
    await this.eventSeatRepository.remove(eventSeat);
  }
}
