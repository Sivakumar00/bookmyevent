import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { EventSeat, EventSeatStatus } from '../../entities/event-seat.entity';
import { Event } from '../../entities/event.entity';
import { Ticket } from '../../entities/ticket.entity';
import { PaginationQueryDto, SortOrder } from '../../common/pagination.dto';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';
import { CreateOrderDto, UpdateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(EventSeat)
    private readonly eventSeatRepository: Repository<EventSeat>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const seatIds = createOrderDto.seatIds;

      const uniqueSeatIds = new Set(seatIds);
      if (uniqueSeatIds.size !== seatIds.length) {
        throw new ConflictError('Duplicate seats are not allowed');
      }

      if (!seatIds || seatIds.length === 0) {
        throw new BadRequestError('At least one seat must be selected');
      }

      // Lock seats with pessimistic write (no leftJoin to avoid FOR UPDATE on nullable)
      const seats = await queryRunner.manager
        .createQueryBuilder(EventSeat, 'seat')
        .setLock('pessimistic_write')
        .where(
          'seat.id IN (:...seatIds) AND seat.eventId = :eventId AND seat.status = :status',
          {
            seatIds,
            eventId: createOrderDto.eventId,
            status: EventSeatStatus.AVAILABLE,
          },
        )
        .getMany();

      if (seats.length !== seatIds.length) {
        const foundIds = new Set(seats.map((s) => s.id));
        const missingIds = seatIds.filter((id) => !foundIds.has(id));
        throw new ConflictError(
          `Selected seats are not available: ${missingIds.join(', ')}`,
        );
      }

      // Fetch event for validation (no lock needed)
      const event = await this.eventRepository.findOne({
        where: { id: createOrderDto.eventId },
      });
      if (!event || event.status === 'CANCELLED') {
        throw new BadRequestError(
          `Cannot book seat for cancelled or invalid event`,
        );
      }

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const seat of seats) {
        // Reserve seat
        seat.status = EventSeatStatus.RESERVED;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        seat.expiresAt = expiresAt;
        const reservedSeat = await queryRunner.manager.save(EventSeat, seat);

        // Fetch ticket for price (no lock needed)
        const ticket = seat.ticketId
          ? await queryRunner.manager.findOne(Ticket, {
              where: { id: seat.ticketId },
            })
          : null;
        const price = ticket ? Number(ticket.price) : 0;
        totalAmount += price;

        orderItems.push(
          this.orderItemRepository.create({
            eventSeatId: reservedSeat.id,
            priceAtPurchase: price,
          }),
        );
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const order = this.orderRepository.create({
        userEmail: createOrderDto.userEmail,
        totalAmount,
        expiresAt,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      for (const item of orderItems) {
        item.orderId = savedOrder.id;
      }
      await queryRunner.manager.save(OrderItem, orderItems);

      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<{ data: Order[]; total: number }> {
    const {
      skip = 0,
      take = 50,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
      search,
    } = pagination;

    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (search) {
      queryBuilder.where('order.userEmail ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy(`order.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.eventSeat', 'items.eventSeat.seat'],
    });
    if (!order) {
      throw new NotFoundError(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async confirm(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === 'CONFIRMED') {
      throw new BadRequestError('Order is already confirmed');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestError('Cannot confirm a cancelled order');
    }

    if (order.status === 'EXPIRED') {
      throw new BadRequestError('Cannot confirm an expired order');
    }

    if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
      await this.expireReservedSeats(order);
      order.status = 'EXPIRED';
      await this.orderRepository.save(order);
      throw new BadRequestError('Order has expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock and update seats to BOOKED
      for (const item of order.items || []) {
        await queryRunner.manager
          .createQueryBuilder(EventSeat, 'seat')
          .setLock('pessimistic_write')
          .where('seat.id = :seatId', { seatId: item.eventSeatId })
          .getOne();

        await queryRunner.manager.update(
          EventSeat,
          { id: item.eventSeatId },
          { status: EventSeatStatus.BOOKED, expiresAt: undefined },
        );
      }

      order.status = 'CONFIRMED';
      order.expiresAt = undefined;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === 'CONFIRMED') {
      throw new BadRequestError('Cannot cancel a confirmed order');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestError('Order is already cancelled');
    }

    if (order.status === 'EXPIRED') {
      throw new BadRequestError('Order is already expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Release seats back to AVAILABLE
      for (const item of order.items || []) {
        await queryRunner.manager
          .createQueryBuilder(EventSeat, 'seat')
          .setLock('pessimistic_write')
          .where('seat.id = :seatId', { seatId: item.eventSeatId })
          .getOne();

        await queryRunner.manager.update(
          EventSeat,
          { id: item.eventSeatId },
          { status: EventSeatStatus.AVAILABLE, expiresAt: undefined },
        );
      }

      order.status = 'CANCELLED';
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderDto.status) {
      if (
        order.status === 'CONFIRMED' &&
        updateOrderDto.status !== 'CONFIRMED'
      ) {
        throw new BadRequestError('Cannot change status of a confirmed order');
      }
    }

    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);

    if (order.status === 'CONFIRMED') {
      throw new BadRequestError('Cannot delete a confirmed order');
    }

    if (order.status === 'RESERVED') {
      await this.releaseSeats(order);
    }

    await this.orderRepository.remove(order);
  }

  private async releaseSeats(order: Order): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      for (const item of order.items || []) {
        await queryRunner.manager.update(
          EventSeat,
          { id: item.eventSeatId },
          { status: EventSeatStatus.AVAILABLE, expiresAt: undefined },
        );
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async expireReservedSeats(order: Order): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      for (const item of order.items || []) {
        await queryRunner.manager.update(
          EventSeat,
          { id: item.eventSeatId },
          { status: EventSeatStatus.AVAILABLE, expiresAt: undefined },
        );
      }
    } finally {
      await queryRunner.release();
    }
  }
}
