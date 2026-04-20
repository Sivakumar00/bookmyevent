export class CreateVenueDto {
  name!: string;
  location!: string;
  capacity!: number;
}

export class UpdateVenueDto {
  name?: string;
  location?: string;
  capacity?: number;
}

export class CreateSeatDto {
  row!: string;
  number!: number;
}

export class CreateBulkSeatDto {
  rows!: string[];
  startNumber!: number;
  endNumber!: number;
}

export class DeleteBulkSeatDto {
  seatIds!: string[];
}
