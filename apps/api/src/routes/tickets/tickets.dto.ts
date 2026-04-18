export class CreateTicketDto {
  eventId!: string;
  type!: string;
  price!: number;
}

export class UpdateTicketDto {
  type?: string;
  price?: number;
}
