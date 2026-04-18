import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { databaseConfig } from '../config/database.config';
import { Venue } from '../entities/venue.entity';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Seat } from '../entities/seat.entity';
import { EventSeat } from '../entities/event-seat.entity';
import { MigrationRunner } from '../migrations/migration.service';
import { EventsModule } from '../routes/events/events.module';
import { TicketsModule } from '../routes/tickets/tickets.module';
import { OrdersModule } from '../routes/orders/orders.module';
import { VenuesModule } from '../routes/venues/venues.module';
import { SeatsModule } from '../routes/seats/seats.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseConfig,
      entities: [Venue, Event, Ticket, Order, OrderItem, Seat, EventSeat],
    }),
    TypeOrmModule.forFeature([
      Venue,
      Event,
      Ticket,
      Order,
      OrderItem,
      Seat,
      EventSeat,
    ]),
    EventsModule,
    TicketsModule,
    OrdersModule,
    VenuesModule,
    SeatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, MigrationRunner],
})
export class AppModule {}
