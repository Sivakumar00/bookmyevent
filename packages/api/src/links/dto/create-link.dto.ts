import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinkDto {
  @ApiProperty({ example: 'New Event', minLength: 1, maxLength: 255 })
  title!: string;

  @ApiProperty({ example: 'https://example.com/event', format: 'uri' })
  url!: string;

  @ApiPropertyOptional({ example: 'A new event for testing', maxLength: 1000 })
  description?: string;
}
