import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from './user.entity';
import { Event } from './event.entity';

export enum TicketType {
  VIP = 'VIP',
  REGULAR = 'REGULAR',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, (event) => event.tickets)
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'event_id' })
  eventId!: string;

  @Column({ type: 'enum', enum: TicketType })
  type!: TicketType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'total_quantity', type: 'int' })
  totalQuantity!: number;

  @Column({ name: 'available_quantity', type: 'int' })
  availableQuantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.tickets)
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;
}
