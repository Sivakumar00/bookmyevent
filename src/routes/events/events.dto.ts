export class CreateEventDto {
  name!: string;
  description!: string;
  startTime!: Date;
  endTime!: Date;
  venueId!: string;
  status?: string;
}

export class UpdateEventDto {
  name?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  venueId?: string;
  status?: string;
}

export class CreateSeatAllocationDto {
  seatIds!: string[];
  ticketId!: string;
}

export class CreateBulkSeatAllocationDto {
  rows?: string[];
  startNumber!: number;
  endNumber!: number;
  ticketId!: string;
}
