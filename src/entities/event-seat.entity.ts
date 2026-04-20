import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';

import { Event } from './event.entity';
import { Seat } from './seat.entity';
import { Ticket } from './ticket.entity';
import { OrderItem } from './order-item.entity';

export enum EventSeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  BOOKED = 'BOOKED',
}

@Entity('event_seats')
@Unique(['eventId', 'seatId'])
@Index(['eventId', 'status'])
export class EventSeat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, (event) => event.eventSeats)
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'event_id' })
  eventId!: string;

  @ManyToOne(() => Seat, (seat) => seat.eventSeats)
  @JoinColumn({ name: 'seat_id' })
  seat!: Seat;

  @Column({ name: 'seat_id' })
  seatId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.eventSeats, { nullable: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: Ticket;

  @Column({ name: 'ticket_id', nullable: true })
  ticketId?: string;

  @Column({ type: 'varchar', default: EventSeatStatus.AVAILABLE })
  status!: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(() => OrderItem, (item) => item.eventSeat)
  orderItems!: OrderItem[];
}
