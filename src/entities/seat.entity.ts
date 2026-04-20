import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Venue } from './venue.entity';
import { EventSeat } from './event-seat.entity';

@Entity('seats')
@Unique(['venueId', 'row', 'number'])
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Venue, (venue) => venue.seats)
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  @Column({ name: 'venue_id' })
  venueId!: string;

  @Column()
  row!: string;

  @Column()
  number!: number;

  @OneToMany(() => EventSeat, (eventSeat) => eventSeat.seat)
  eventSeats!: EventSeat[];
}
