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
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto } from './tickets.dto';
import { JoiValidationPipe } from '../../common/joi-validation.pipe';
import {
  ApiResponse as AppApiResponse,
  PaginatedResponse,
} from '../../common/base-response';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { createTicketSchema, updateTicketSchema } from './tickets.validation';

@Controller('events/:eventId/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new JoiValidationPipe(createTicketSchema))
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    const ticket = await this.ticketsService.create(eventId, createTicketDto);
    return new AppApiResponse(ticket, 'Ticket created successfully');
  }

  @Get()
  async findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { data, total } = await this.ticketsService.findAll(
      eventId,
      pagination,
    );
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':ticketId')
  async findOne(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    const ticket = await this.ticketsService.findOne(ticketId, eventId);
    return new AppApiResponse(ticket);
  }

  @Patch(':ticketId')
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Req() req: Request,
  ) {
    const pipe = new JoiValidationPipe(updateTicketSchema);
    const updateTicketDto = pipe.transform(req.body, { type: 'body' } as never);
    const ticket = await this.ticketsService.update(
      ticketId,
      updateTicketDto as UpdateTicketDto,
      eventId,
    );
    return new AppApiResponse(ticket, 'Ticket updated successfully');
  }

  @Delete(':ticketId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    await this.ticketsService.remove(ticketId, eventId);
    return new AppApiResponse(null, 'Ticket deleted successfully');
  }
}
