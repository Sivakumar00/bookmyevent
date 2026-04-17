export class CreateVenueDto {
  name!: string;
  location!: string;
  capacity!: number;
  createdById?: string;
}

export class UpdateVenueDto {
  name?: string;
  location?: string;
  capacity?: number;
  createdById?: string;
}
