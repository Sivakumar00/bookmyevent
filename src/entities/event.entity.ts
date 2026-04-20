import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

import { Venue } from './venue.entity';
import { Ticket } from './ticket.entity';
import { EventSeat } from './event-seat.entity';

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime!: Date;

  @ManyToOne(() => Venue, (venue) => venue.events)
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  @Column({ name: 'venue_id' })
  venueId!: string;

  @Column({ type: 'varchar', default: EventStatus.DRAFT })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets!: Ticket[];

  @OneToMany(() => EventSeat, (eventSeat) => eventSeat.event)
  eventSeats!: EventSeat[];
}
