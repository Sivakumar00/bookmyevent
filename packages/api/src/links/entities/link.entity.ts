import { ApiProperty } from '@nestjs/swagger';

export class Link {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id!: number;

  @ApiProperty({
    example: 'https://turborepo.dev/docs',
    format: 'uri',
    description: 'Full URL to the resource',
  })
  url!: string;

  @ApiProperty({
    example: 'Installation Guide',
    description: 'Display title for the link',
  })
  title!: string;

  @ApiProperty({
    example: 'Get started with Turborepo in a few moments',
    description: 'Brief description of the link content',
  })
  description!: string;
}
