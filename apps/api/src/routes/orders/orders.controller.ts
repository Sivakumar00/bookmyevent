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
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './orders.dto';
import {
  ApiResponse as AppApiResponse,
  PaginatedResponse,
} from '../../common/base-response';
import { PaginationQueryDto } from '../../common/pagination.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    return new AppApiResponse(
      order,
      'Order reserved. Please confirm within 10 minutes.',
    );
  }

  @Get()
  async findAll(@Query() pagination: PaginationQueryDto) {
    const { data, total } = await this.ordersService.findAll(pagination);
    const { skip = 0, take = 50 } = pagination;
    return new PaginatedResponse(data, skip, take, total);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findOne(id);
    return new AppApiResponse(order);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.confirm(id);
    return new AppApiResponse(order, 'Order confirmed successfully');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.cancel(id);
    return new AppApiResponse(order, 'Order cancelled successfully');
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const order = await this.ordersService.update(id, updateOrderDto);
    return new AppApiResponse(order, 'Order updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ordersService.remove(id);
    return new AppApiResponse(null, 'Order deleted successfully');
  }
}
