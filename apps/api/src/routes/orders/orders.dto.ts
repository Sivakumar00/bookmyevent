export class CreateOrderDto {
  userEmail!: string;
  seatIds!: string[];
}

export class UpdateOrderDto {
  status?: string;
}
