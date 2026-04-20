export class CreateTicketDto {
  type!: string;
  price!: number;
}

export class UpdateTicketDto {
  type?: string;
  price?: number;
}
