import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { VenuesService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './venue.dto';
import { JoiValidationPipe } from '../common/joi-validation.pipe';
import { ApiResponse } from '../common/base-response';
import { createVenueSchema, updateVenueSchema } from './venue.validation';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new JoiValidationPipe(createVenueSchema))
  async create(@Body() createVenueDto: CreateVenueDto) {
    const venue = await this.venuesService.create(createVenueDto);
    return new ApiResponse(venue, 'Venue created successfully');
  }

  @Get()
  async findAll() {
    const venues = await this.venuesService.findAll();
    return new ApiResponse(venues);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const venue = await this.venuesService.findOne(id);
    return new ApiResponse(venue);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(updateVenueSchema))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVenueDto: UpdateVenueDto,
  ) {
    const venue = await this.venuesService.update(id, updateVenueDto);
    return new ApiResponse(venue, 'Venue updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.venuesService.remove(id);
    return new ApiResponse(null, 'Venue deleted successfully');
  }
}
