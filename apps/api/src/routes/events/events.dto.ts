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
