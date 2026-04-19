import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../entities/ticket.entity';
import { EventSeat, EventSeatStatus } from '../../entities/event-seat.entity';
import { CreateTicketDto, UpdateTicketDto } from './tickets.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import { BadRequestError, NotFoundError } from '../../shared/errors';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(EventSeat)
    private readonly eventSeatRepository: Repository<EventSeat>,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketRepository.create(createTicketDto);
    return this.ticketRepository.save(ticket);
  }

  async findAll(
    pagination: PaginationQueryDto,
    eventId?: string,
  ): Promise<{ data: Ticket[]; total: number }> {
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket');

    if (eventId) {
      queryBuilder.where('ticket.eventId = :eventId', { eventId });
    }

    if (search) {
      if (eventId) {
        queryBuilder.andWhere('(ticket.type ILIKE :search)', {
          search: `%${search}%`,
        });
      } else {
        queryBuilder.where('(ticket.type ILIKE :search)', {
          search: `%${search}%`,
        });
      }
    }

    const [data, total] = await queryBuilder
      .orderBy(`ticket.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID "${id}" not found`);
    }
    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID "${id}" not found`);
    }
    Object.assign(ticket, updateTicketDto);
    return this.ticketRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    const ticket = await this.findOne(id);

    const allocatedSeats = await this.eventSeatRepository.find({
      where: { ticketId: id },
    });

    if (allocatedSeats.length > 0) {
      throw new BadRequestError(
        `Cannot delete ticket which is already allocated to seats. Please remove the allocations first.`,
      );
    }

    await this.ticketRepository.remove(ticket);
  }
}
