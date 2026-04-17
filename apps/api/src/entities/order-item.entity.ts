import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Ticket } from './ticket.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @Column({ name: 'ticket_id' })
  ticketId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'price_at_purchase',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  priceAtPurchase!: number;
}
