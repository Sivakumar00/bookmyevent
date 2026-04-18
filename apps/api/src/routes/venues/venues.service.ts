import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Venue } from '../../entities/venue.entity';
import { Seat } from '../../entities/seat.entity';
import { Event } from '../../entities/event.entity';
import {
  CreateVenueDto,
  CreateSeatDto,
  CreateBulkSeatDto,
  UpdateVenueDto,
} from './venues.dto';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import { BadRequestError, NotFoundError } from '../../shared/errors';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    const venueDetails = {
      ...createVenueDto,
      name: createVenueDto.name.trim(),
      location: createVenueDto.location.trim(),
      capacity: createVenueDto.capacity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const venue = this.venueRepository.create(venueDetails);
    return this.venueRepository.save(venue);
  }

  async createSeat(
    venueId: string,
    createSeatDto: CreateSeatDto,
  ): Promise<Seat> {
    await this.findOne(venueId);

    const existingSeat = await this.seatRepository.findOne({
      where: { venueId, row: createSeatDto.row, number: createSeatDto.number },
    });
    if (existingSeat) {
      throw new BadRequestError(
        `Seat row "${createSeatDto.row}" number "${createSeatDto.number}" already exists`,
      );
    }

    const seat = this.seatRepository.create({
      venueId,
      row: createSeatDto.row,
      number: createSeatDto.number,
    });
    return this.seatRepository.save(seat);
  }

  async createBulkSeats(
    venueId: string,
    createBulkDto: CreateBulkSeatDto,
  ): Promise<void> {
    await this.findOne(venueId);

    if (!createBulkDto.rows || createBulkDto.rows.length === 0) {
      throw new BadRequestError('At least one row must be specified');
    }

    // Generate all seat combinations in one query
    const seats: { venueId: string; row: string; number: number }[] = [];
    for (const row of createBulkDto.rows) {
      for (
        let num = createBulkDto.startNumber;
        num <= createBulkDto.endNumber;
        num++
      ) {
        seats.push({ venueId, row, number: num });
      }
    }

    // Bulk insert, ignore duplicates
    await this.seatRepository
      .createQueryBuilder()
      .insert()
      .into(Seat)
      .values(seats)
      .onConflict('("venue_id", "row", "number") DO NOTHING')
      .execute();
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Venue[]; total: number }> {
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.venueRepository.createQueryBuilder('venue');

    if (search) {
      queryBuilder.where(
        '(venue.name ILIKE :search OR venue.location ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy(`venue.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({ where: { id } });
    if (!venue) {
      throw new NotFoundError(`Venue with ID "${id}" not found`);
    }
    return venue;
  }

  async getSeats(
    venueId: string,
    pagination: PaginationQueryDto,
  ): Promise<{ data: Seat[]; total: number }> {
    await this.findOne(venueId);
    const { skip = 0, take = 50 } = pagination;
    const [data, total] = await this.seatRepository.findAndCount({
      where: { venueId },
      order: { row: 'ASC', number: 'ASC' },
      skip,
      take,
    });
    return { data, total };
  }

  async getEvents(
    venueId: string,
    pagination: PaginationQueryDto,
  ): Promise<{ data: Event[]; total: number }> {
    await this.findOne(venueId);
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.venueId = :venueId', { venueId });

    if (search) {
      queryBuilder.andWhere('event.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy(`event.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.findOne(id);
    Object.assign(venue, updateVenueDto);
    return this.venueRepository.save(venue);
  }

  async remove(id: string): Promise<void> {
    const venueWithEvents = await this.venueRepository
      .createQueryBuilder('venue')
      .innerJoin('venue.events', 'event')
      .where('venue.id = :id', { id })
      .getOne();
    if (
      venueWithEvents &&
      venueWithEvents.events &&
      venueWithEvents.events.length > 0
    ) {
      throw new BadRequestError(
        `Venue with ID "${id}" cannot be deleted because it has events`,
      );
    }
    const venue = await this.findOne(id);
    await this.venueRepository.remove(venue);
  }
}
