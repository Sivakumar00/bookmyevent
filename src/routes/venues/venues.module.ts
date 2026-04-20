import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from '../../entities/venue.entity';
import { Seat } from '../../entities/seat.entity';
import { Event } from '../../entities/event.entity';
import { EventSeat } from '../../entities/event-seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venue, Seat, Event, EventSeat])],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
