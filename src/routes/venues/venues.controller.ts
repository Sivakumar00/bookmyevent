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
import {
  CreateVenueDto,
  CreateSeatDto,
  CreateBulkSeatDto,
  DeleteBulkSeatDto,
  UpdateVenueDto,
} from './venues.dto';
import { JoiValidationPipe } from '../../common/joi-validation.pipe';
import { ApiResponse, PaginatedResponse } from '../../common/base-response';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { createVenueSchema, updateVenueSchema } from './venues.validation';

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

  @Get(':id/seats')
  async getSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { data, total } = await this.venuesService.getSeats(id, pagination);
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id/events')
  async getEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { data, total } = await this.venuesService.getEvents(id, pagination);
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
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

  @Post(':id/seats')
  @HttpCode(HttpStatus.CREATED)
  async createSeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createSeatDto: CreateSeatDto,
  ) {
    const seat = await this.venuesService.createSeat(id, createSeatDto);
    return new ApiResponse(seat, 'Seat created successfully');
  }

  @Post(':id/seats/bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulkSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createBulkDto: CreateBulkSeatDto,
  ) {
    const count =
      createBulkDto.rows.length *
      (createBulkDto.endNumber - createBulkDto.startNumber + 1);
    await this.venuesService.createBulkSeats(id, createBulkDto);
    return new ApiResponse(null, `${count} seats created successfully`);
  }

  @Delete(':id/seats/:seatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seatId', ParseUUIDPipe) seatId: string,
  ) {
    await this.venuesService.removeSeat(id, seatId);
    return new ApiResponse(null, 'Seat deleted successfully');
  }

  @Delete(':id/seats/bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBulkSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteBulkDto: DeleteBulkSeatDto,
  ) {
    await this.venuesService.removeBulkSeats(id, deleteBulkDto.seatIds);
    return new ApiResponse(null, 'Seats deleted successfully');
  }
}
