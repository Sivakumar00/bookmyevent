import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { databaseConfig } from '../config/database.config';
import { User } from '../entities/user.entity';
import { Venue } from '../entities/venue.entity';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { MigrationRunner } from '../migrations/migration.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseConfig,
      entities: [User, Venue, Event, Ticket, Order, OrderItem],
    }),
    TypeOrmModule.forFeature([User, Venue, Event, Ticket, Order, OrderItem]),
  ],
  controllers: [AppController],
  providers: [AppService, MigrationRunner],
})
export class AppModule {}
