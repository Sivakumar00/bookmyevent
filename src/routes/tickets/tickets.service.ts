import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../entities/ticket.entity';
import { Event } from '../../entities/event.entity';
import { EventSeat } from '../../entities/event-seat.entity';
import { CreateTicketDto, UpdateTicketDto } from './tickets.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import {
  BadRequestError,
  NotFoundError,
  UnprocessableError,
} from '../../shared/errors';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventSeat)
    private readonly eventSeatRepository: Repository<EventSeat>,
  ) {}

  private async findEvent(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundError(`Event with ID "${eventId}" not found`);
    }
    return event;
  }

  async create(
    eventId: string,
    createTicketDto: CreateTicketDto,
  ): Promise<Ticket> {
    await this.findEvent(eventId);
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      eventId,
    });
    return this.ticketRepository.save(ticket);
  }

  async findAll(
    eventId: string,
    pagination: PaginationQueryDto,
  ): Promise<{ data: Ticket[]; total: number }> {
    await this.findEvent(eventId);

    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.eventId = :eventId', { eventId });

    if (search) {
      queryBuilder.andWhere('ticket.type ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy(`ticket.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string, eventId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, eventId },
    });
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID "${id}" not found`);
    }
    return ticket;
  }

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    eventId: string,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, eventId);
    Object.assign(ticket, updateTicketDto);
    return this.ticketRepository.save(ticket);
  }

  async remove(id: string, eventId: string): Promise<void> {
    const ticket = await this.findOne(id, eventId);

    const allocatedSeats = await this.eventSeatRepository.find({
      where: { ticketId: id },
    });

    if (allocatedSeats.length > 0) {
      throw new BadRequestError(
        'Cannot delete ticket which is already allocated to seats. Please remove the allocations first.',
      );
    }

    await this.ticketRepository.remove(ticket);
  }
}
