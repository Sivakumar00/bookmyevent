export class CreateSeatDto {
  eventId!: string;
  row!: string;
  number!: number;
  ticketId?: string;
}

export class CreateBulkSeatDto {
  eventId!: string;
  rows?: string[];
  startNumber!: number;
  endNumber!: number;
  ticketId?: string;
}

export class UpdateSeatDto {
  status?: string;
  ticketId?: string;
}

export class LockSeatsDto {
  seatIds!: string[];
}

export class BookSeatsDto {
  seatIds!: string[];
}

export class ReleaseSeatsDto {
  seatIds!: string[];
}
