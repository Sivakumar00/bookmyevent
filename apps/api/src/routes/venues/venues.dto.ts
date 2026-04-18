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
