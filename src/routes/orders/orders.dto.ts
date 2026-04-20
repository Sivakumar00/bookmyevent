export class CreateOrderDto {
  userEmail!: string;
  eventId!: string;
  seatIds!: string[];
}

export class UpdateOrderDto {
  status?: string;
}
