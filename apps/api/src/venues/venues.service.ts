import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Venue } from '../entities/venue.entity';
import { CreateVenueDto, UpdateVenueDto } from './venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    const venue = this.venueRepository.create(createVenueDto);
    return this.venueRepository.save(venue);
  }

  async findAll(): Promise<Venue[]> {
    return this.venueRepository.find({ relations: ['createdBy'] });
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }
    return venue;
  }

  async update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.findOne(id);
    Object.assign(venue, updateVenueDto);
    return this.venueRepository.save(venue);
  }

  async remove(id: string): Promise<void> {
    const venue = await this.findOne(id);
    await this.venueRepository.remove(venue);
  }
}
