import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventSeat, EventSeatStatus } from '../../entities/event-seat.entity';
import { Event } from '../../entities/event.entity';
import { Seat } from '../../entities/seat.entity';
import { Ticket } from '../../entities/ticket.entity';
import { CreateSeatDto, CreateBulkSeatDto, UpdateSeatDto } from './seats.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import { NotFoundError, BadRequestError } from '../../shared/errors';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(EventSeat)
    private readonly eventSeatRepository: Repository<EventSeat>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async create(createSeatDto: CreateSeatDto): Promise<EventSeat> {
    const event = await this.eventRepository.findOne({
      where: { id: createSeatDto.eventId },
    });
    if (!event) {
      throw new NotFoundError(
        `Event with ID "${createSeatDto.eventId}" not found`,
      );
    }

    const seat = await this.seatRepository.findOne({
      where: { row: createSeatDto.row, number: createSeatDto.number },
    });
    if (!seat) {
      throw new NotFoundError(
        `Seat with row "${createSeatDto.row}" and number "${createSeatDto.number}" not found`,
      );
    }

    const existingSeat = await this.eventSeatRepository.findOne({
      where: { eventId: createSeatDto.eventId, seatId: seat.id },
    });
    if (existingSeat) {
      throw new BadRequestError(`Seat is already allocated for this event`);
    }

    const eventSeat = this.eventSeatRepository.create({
      eventId: createSeatDto.eventId,
      seatId: seat.id,
      ticketId: createSeatDto.ticketId,
      status: EventSeatStatus.AVAILABLE,
    });
    return this.eventSeatRepository.save(eventSeat);
  }

  async createBulk(
    eventId: string,
    createBulkDto: CreateBulkSeatDto,
  ): Promise<EventSeat[]> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundError(`Event with ID "${eventId}" not found`);
    }

    const rows = createBulkDto.rows || [];
    if (rows.length === 0) {
      throw new BadRequestError('At least one row must be specified');
    }

    // Find all seats for the specified rows and number range
    const seats = await this.seatRepository
      .createQueryBuilder('seat')
      .where('seat.row IN (:...rows)', { rows })
      .andWhere('seat.number >= :start', { start: createBulkDto.startNumber })
      .andWhere('seat.number <= :end', { end: createBulkDto.endNumber })
      .getMany();

    if (seats.length === 0) {
      throw new NotFoundError(
        'No seats found for the specified rows and range',
      );
    }

    // Check existing event seats
    const seatIds = seats.map((s) => s.id);
    const existingEventSeats = await this.eventSeatRepository.find({
      where: { eventId, seatId: In(seatIds) },
    });
    const existingSeatIds = new Set(existingEventSeats.map((s) => s.seatId));

    // Filter out existing seats and create new ones
    const newEventSeats = seats
      .filter((seat) => !existingSeatIds.has(seat.id))
      .map((seat) =>
        this.eventSeatRepository.create({
          eventId,
          seatId: seat.id,
          ticketId: createBulkDto.ticketId,
          status: EventSeatStatus.AVAILABLE,
        }),
      );

    if (newEventSeats.length > 0) {
      return this.eventSeatRepository.save(newEventSeats);
    }
    return [];
  }

  async findAll(
    pagination: PaginationQueryDto,
    eventId?: string,
  ): Promise<{ data: EventSeat[]; total: number }> {
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = pagination;

    const queryBuilder = this.eventSeatRepository
      .createQueryBuilder('eventSeat')
      .leftJoinAndSelect('eventSeat.seat', 'seat')
      .leftJoinAndSelect('eventSeat.event', 'event')
      .leftJoinAndSelect('eventSeat.ticket', 'ticket');

    if (eventId) {
      queryBuilder.where('eventSeat.eventId = :eventId', { eventId });
    }

    const [data, total] = await queryBuilder
      .orderBy(`eventSeat.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<EventSeat> {
    const eventSeat = await this.eventSeatRepository.findOne({
      where: { id },
      relations: ['seat', 'event', 'ticket'],
    });
    if (!eventSeat) {
      throw new NotFoundError(`Event seat with ID "${id}" not found`);
    }
    return eventSeat;
  }

  async update(id: string, updateSeatDto: UpdateSeatDto): Promise<EventSeat> {
    const eventSeat = await this.findOne(id);

    if (updateSeatDto.status) {
      if (eventSeat.status === EventSeatStatus.BOOKED) {
        throw new BadRequestError('Cannot modify a booked seat');
      }
    }

    if (updateSeatDto.ticketId) {
      const ticket = await this.ticketRepository.findOne({
        where: { id: updateSeatDto.ticketId },
      });
      if (!ticket) {
        throw new NotFoundError(
          `Ticket with ID "${updateSeatDto.ticketId}" not found`,
        );
      }
      eventSeat.ticketId = updateSeatDto.ticketId;
    }

    if (updateSeatDto.status) {
      eventSeat.status = updateSeatDto.status;
    }

    return this.eventSeatRepository.save(eventSeat);
  }

  async remove(id: string): Promise<void> {
    const eventSeat = await this.findOne(id);
    if (eventSeat.status === EventSeatStatus.BOOKED) {
      throw new BadRequestError('Cannot delete a booked seat');
    }
    if (eventSeat.status === EventSeatStatus.RESERVED) {
      throw new BadRequestError('Cannot delete a reserved seat');
    }
    await this.eventSeatRepository.remove(eventSeat);
  }

  async getAvailability(eventId: string): Promise<{
    totalSeats: number;
    available: number;
    reserved: number;
    booked: number;
  }> {
    const seats = await this.eventSeatRepository.find({ where: { eventId } });

    return {
      totalSeats: seats.length,
      available: seats.filter((s) => s.status === EventSeatStatus.AVAILABLE)
        .length,
      reserved: seats.filter((s) => s.status === EventSeatStatus.RESERVED)
        .length,
      booked: seats.filter((s) => s.status === EventSeatStatus.BOOKED).length,
    };
  }

  async lockSeats(seatIds: string[]): Promise<EventSeat[]> {
    const seats = await this.eventSeatRepository.findByIds(seatIds);

    if (seats.length !== seatIds.length) {
      const foundIds = seats.map((s) => s.id);
      const missingIds = seatIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundError(`Seats not found: ${missingIds.join(', ')}`);
    }

    const unavailableSeats = seats.filter(
      (s) => s.status !== EventSeatStatus.AVAILABLE,
    );
    if (unavailableSeats.length > 0) {
      const seatIdsList = unavailableSeats.map((s) => s.id).join(', ');
      throw new BadRequestError(
        `Cannot lock seats: ${seatIdsList} are not available`,
      );
    }

    for (const seat of seats) {
      seat.status = EventSeatStatus.RESERVED;
    }

    return this.eventSeatRepository.save(seats);
  }

  async bookSeats(seatIds: string[]): Promise<EventSeat[]> {
    const seats = await this.eventSeatRepository.findByIds(seatIds);

    if (seats.length !== seatIds.length) {
      const foundIds = seats.map((s) => s.id);
      const missingIds = seatIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundError(`Seats not found: ${missingIds.join(', ')}`);
    }

    const invalidSeats = seats.filter(
      (s) => s.status !== EventSeatStatus.RESERVED,
    );
    if (invalidSeats.length > 0) {
      const seatIdsList = invalidSeats.map((s) => s.id).join(', ');
      throw new BadRequestError(
        `Cannot book seats: ${seatIdsList} are not in reserved state`,
      );
    }

    for (const seat of seats) {
      seat.status = EventSeatStatus.BOOKED;
    }

    return this.eventSeatRepository.save(seats);
  }

  async releaseSeats(seatIds: string[]): Promise<EventSeat[]> {
    const seats = await this.eventSeatRepository.findByIds(seatIds);

    if (seats.length !== seatIds.length) {
      const foundIds = seats.map((s) => s.id);
      const missingIds = seatIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundError(`Seats not found: ${missingIds.join(', ')}`);
    }

    const invalidSeats = seats.filter(
      (s) => s.status !== EventSeatStatus.RESERVED,
    );
    if (invalidSeats.length > 0) {
      const seatIdsList = invalidSeats.map((s) => s.id).join(', ');
      throw new BadRequestError(
        `Cannot release seats: ${seatIdsList} are not in reserved state`,
      );
    }

    for (const seat of seats) {
      seat.status = EventSeatStatus.AVAILABLE;
    }

    return this.eventSeatRepository.save(seats);
  }
}
