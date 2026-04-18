import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { databaseConfig } from '../config/database.config';
import { Venue } from '../entities/venue.entity';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { Booking } from '../entities/booking.entity';
import { BookingItem } from '../entities/booking-item.entity';
import { MigrationRunner } from '../migrations/migration.service';
import { VenuesModule } from '../routes/venues/venues.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseConfig,
      entities: [Venue, Event, Ticket, Booking, BookingItem],
    }),
    TypeOrmModule.forFeature([Venue, Event, Ticket, Booking, BookingItem]),
    VenuesModule,
  ],
  controllers: [AppController],
  providers: [AppService, MigrationRunner],
})
export class AppModule {}
