import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Event } from './event.entity';
import { Seat } from './seat.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  location!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Event, (event) => event.venue)
  events!: Event[];

  @OneToMany(() => Seat, (seat) => seat.venue)
  seats!: Seat[];
}
