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
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './events.dto';
import { JoiValidationPipe } from '../../common/joi-validation.pipe';
import {
  ApiResponse as AppApiResponse,
  PaginatedResponse,
} from '../../common/base-response';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { createEventSchema, updateEventSchema } from './events.validation';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new JoiValidationPipe(createEventSchema))
  async create(@Body() createEventDto: CreateEventDto) {
    const event = await this.eventsService.create(createEventDto);
    return new AppApiResponse(event, 'Event created successfully');
  }

  @Get()
  async findAll(@Query() pagination: PaginationQueryDto) {
    const { data, total } = await this.eventsService.findAll(pagination);
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.findOne(id);
    return new AppApiResponse(event);
  }

  @Get(':id/seats/status')
  async getSeatsStatus(@Param('id', ParseUUIDPipe) id: string) {
    const status = await this.eventsService.getSeatsStatus(id);
    return new AppApiResponse(status);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const pipe = new JoiValidationPipe(updateEventSchema);
    const updateEventDto = pipe.transform(req.body, { type: 'body' } as never);
    const event = await this.eventsService.update(
      id,
      updateEventDto as UpdateEventDto,
    );
    return new AppApiResponse(event, 'Event updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventsService.remove(id);
    return new AppApiResponse(null, 'Event deleted successfully');
  }
}
