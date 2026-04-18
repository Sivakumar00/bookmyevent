import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToEventSeats1713500000000
  implements MigrationInterface
{
  name = 'AddCreatedAtToEventSeats1713500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_seats" ADD "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP COLUMN "created_at"`,
    );
  }
}
