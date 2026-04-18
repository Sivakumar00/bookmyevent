import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from '../../entities/event.entity';
import { Venue } from '../../entities/venue.entity';
import { Ticket } from '../../entities/ticket.entity';
import { EventSeat } from '../../entities/event-seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Venue, Ticket, EventSeat])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
