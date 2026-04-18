import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSeat } from '../../entities/event-seat.entity';
import { Event } from '../../entities/event.entity';
import { Seat } from '../../entities/seat.entity';
import { Ticket } from '../../entities/ticket.entity';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventSeat, Event, Seat, Ticket])],
  controllers: [SeatsController],
  providers: [SeatsService],
})
export class SeatsModule {}
