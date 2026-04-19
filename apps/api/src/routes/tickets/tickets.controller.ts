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

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new JoiValidationPipe(createTicketSchema))
  async create(@Body() createTicketDto: CreateTicketDto) {
    const ticket = await this.ticketsService.create(createTicketDto);
    return new AppApiResponse(ticket, 'Ticket created successfully');
  }

  @Get()
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('eventId') eventId?: string,
  ) {
    const { data, total } = await this.ticketsService.findAll(
      pagination,
      eventId,
    );
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const ticket = await this.ticketsService.findOne(id);
    return new AppApiResponse(ticket);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const pipe = new JoiValidationPipe(updateTicketSchema);
    const updateTicketDto = pipe.transform(req.body, { type: 'body' } as never);
    const ticket = await this.ticketsService.update(
      id,
      updateTicketDto as UpdateTicketDto,
    );
    return new AppApiResponse(ticket, 'Ticket updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ticketsService.remove(id);
    return new AppApiResponse(null, 'Ticket deleted successfully');
  }
}
