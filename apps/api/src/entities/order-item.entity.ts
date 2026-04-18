import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { EventSeat } from './event-seat.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => EventSeat, (eventSeat) => eventSeat.orderItems)
  @JoinColumn({ name: 'event_seat_id' })
  eventSeat!: EventSeat;

  @Column({ name: 'event_seat_id' })
  eventSeatId!: string;

  @Column({
    name: 'price_at_purchase',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  priceAtPurchase!: number;
}
