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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeatsService } from './seats.service';
import {
  CreateSeatDto,
  CreateBulkSeatDto,
  UpdateSeatDto,
  LockSeatsDto,
  BookSeatsDto,
  ReleaseSeatsDto,
} from './seats.dto';
import {
  ApiResponse as AppApiResponse,
  PaginatedResponse,
} from '../../common/base-response';
import { PaginationQueryDto } from '../../common/pagination.dto';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSeatDto: CreateSeatDto) {
    const seat = await this.seatsService.create(createSeatDto);
    return new AppApiResponse(seat, 'Seat created successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body() createBulkDto: CreateBulkSeatDto) {
    const seatList = await this.seatsService.createBulk(
      createBulkDto.eventId,
      createBulkDto,
    );
    return new AppApiResponse(
      seatList,
      `${seatList.length} seats created successfully`,
    );
  }

  @Post('lock')
  async lockSeats(@Body() lockSeatsDto: LockSeatsDto) {
    const seatList = await this.seatsService.lockSeats(lockSeatsDto.seatIds);
    return new AppApiResponse(seatList, 'Seats locked');
  }

  @Post('book')
  async bookSeats(@Body() bookSeatsDto: BookSeatsDto) {
    const seatList = await this.seatsService.bookSeats(bookSeatsDto.seatIds);
    return new AppApiResponse(seatList, 'Seats booked successfully');
  }

  @Post('release')
  async releaseSeats(@Body() releaseSeatsDto: ReleaseSeatsDto) {
    const seatList = await this.seatsService.releaseSeats(
      releaseSeatsDto.seatIds,
    );
    return new AppApiResponse(seatList, 'Seats released successfully');
  }

  @Get()
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('eventId') eventId?: string,
  ) {
    const { data, total } = await this.seatsService.findAll(
      pagination,
      eventId,
    );
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const seat = await this.seatsService.findOne(id);
    return new AppApiResponse(seat);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSeatDto: UpdateSeatDto,
  ) {
    const seat = await this.seatsService.update(id, updateSeatDto);
    return new AppApiResponse(seat, 'Seat updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.seatsService.remove(id);
    return new AppApiResponse(null, 'Seat deleted successfully');
  }
}
