import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Booking } from './booking.entity';
import { Ticket } from './ticket.entity';

@Entity('booking_items')
export class BookingItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Booking, (booking) => booking.items)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @Column({ name: 'booking_id' })
  bookingId!: string;

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
