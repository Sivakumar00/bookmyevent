import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

import { Venue } from './venue.entity';
import { Event } from './event.entity';
import { Ticket } from './ticket.entity';
import { Order } from './order.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100 })
  email!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @OneToMany(() => Venue, (venue) => venue.createdBy)
  venues!: Venue[];

  @OneToMany(() => Event, (event) => event.createdBy)
  events!: Event[];

  @OneToMany(() => Ticket, (ticket) => ticket.createdBy)
  tickets!: Ticket[];

  @OneToMany(() => Order, (order) => order.createdBy)
  orders!: Order[];
}
