import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { VenuesService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './venue.dto';
import { JoiValidationPipe } from '../common/joi-validation.pipe';
import { ApiResponse, PaginatedResponse } from '../common/base-response';
import { PaginationQueryDto } from '../common/pagination.dto';
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
  async findAll(@Query() pagination: PaginationQueryDto) {
    const { data, total } = await this.venuesService.findAll(pagination);
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const venue = await this.venuesService.findOne(id);
    return new ApiResponse(venue);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const pipe = new JoiValidationPipe(updateVenueSchema);
    const updateVenueDto = pipe.transform(req.body, { type: 'body' } as never);
    const venue = await this.venuesService.update(
      id,
      updateVenueDto as UpdateVenueDto,
    );
    return new ApiResponse(venue, 'Venue updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.venuesService.remove(id);
    return new ApiResponse(null, 'Venue deleted successfully');
  }
}
