import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { EventSeat, EventSeatStatus } from '../../entities/event-seat.entity';
import { Seat } from '../../entities/seat.entity';
import { CreateEventDto, UpdateEventDto } from './events.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '../../shared/errors';
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
    const bookedSeatsCount = await this.eventSeatRepository.count({
      where: { eventId: id, status: EventSeatStatus.BOOKED },
    });

    if (bookedSeatsCount > 0) {
      throw new BadRequestError(
        'Cannot delete an event with confirmed bookings',
      );
    }

    await this.eventRepository.remove(event);
  }

  async getSeats(
    eventId: string,
    pagination: PaginationQueryDto,
    status?: string,
  ): Promise<{ data: EventSeat[]; total: number }> {
    await this.findOne(eventId);

    if (
      status &&
      !Object.values(EventSeatStatus).includes(status as EventSeatStatus)
    ) {
      throw new BadRequestError(
        `Invalid status "${status}". Must be one of: ${Object.values(EventSeatStatus).join(', ')}`,
      );
    }

    const { skip = 0, take = 50 } = pagination;

    const qb = this.eventSeatRepository
      .createQueryBuilder('eventSeat')
      .leftJoinAndSelect('eventSeat.seat', 'seat')
      .leftJoinAndSelect('eventSeat.ticket', 'ticket')
      .where('eventSeat.eventId = :eventId', { eventId })
      .orderBy('seat.row', 'ASC')
      .addOrderBy('seat.number', 'ASC')
      .skip(skip)
      .take(take);

    if (status) {
      qb.andWhere('eventSeat.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getSeatsStatus(eventId: string): Promise<{
    totalSeats: number;
    available: number;
    reserved: number;
    booked: number;
  }> {
    await this.findOne(eventId);

    const rows: { status: string; count: string }[] =
      await this.eventSeatRepository
        .createQueryBuilder('es')
        .select('es.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('es.eventId = :eventId', { eventId })
        .groupBy('es.status')
        .getRawMany();

    const counts = Object.fromEntries(
      rows.map((r) => [r.status, Number(r.count)]),
    );

    return {
      totalSeats: rows.reduce((sum, r) => sum + Number(r.count), 0),
      available: counts[EventSeatStatus.AVAILABLE] ?? 0,
      reserved: counts[EventSeatStatus.RESERVED] ?? 0,
      booked: counts[EventSeatStatus.BOOKED] ?? 0,
    };
  }

  async allocateSeats(
    eventId: string,
    seatIds: string[],
    ticketId: string,
  ): Promise<EventSeat[]> {
    const event = await this.findOne(eventId);

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID "${ticketId}" not found`);
    }
    if (ticket.eventId !== eventId) {
      throw new UnprocessableError(
        `Ticket "${ticketId}" does not belong to event "${eventId}"`,
      );
    }

    const dbSeats = await this.seatRepository.findByIds(seatIds);
    if (dbSeats.length !== seatIds.length) {
      const foundIds = new Set(dbSeats.map((s) => s.id));
      const missing = seatIds.filter((id) => !foundIds.has(id));
      throw new NotFoundError(`Seats not found: ${missing.join(', ')}`);
    }
    const wrongVenue = dbSeats.filter((s) => s.venueId !== event.venueId);
    if (wrongVenue.length > 0) {
      throw new UnprocessableError(
        `Seats do not belong to the event's venue: ${wrongVenue.map((s) => s.id).join(', ')}`,
      );
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
        throw new ConflictError(
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

  async releaseStaleSeats(eventId: string): Promise<number> {
    await this.findOne(eventId);
    const now = new Date();

    const result = await this.eventSeatRepository
      .createQueryBuilder()
      .update(EventSeat)
      .set({
        status: EventSeatStatus.AVAILABLE,
        expiresAt: null,
      })
      .where('eventId = :eventId', { eventId })
      .andWhere('status = :status', { status: EventSeatStatus.RESERVED })
      .andWhere('expiresAt < :now', { now })
      .execute();

    return result.affected || 0;
  }
}
