import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Event } from './event.entity';
import { EventSeat } from './event-seat.entity';

@Entity('tickets')
@Unique(['eventId', 'type'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, (event) => event.tickets)
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'event_id' })
  eventId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => EventSeat, (eventSeat) => eventSeat.ticket)
  eventSeats!: EventSeat[];
}
