import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueSeatVenueRowNumber1713580000000
  implements MigrationInterface
{
  name = 'AddUniqueSeatVenueRowNumber1713580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check for duplicates
    const duplicates = await queryRunner.query(`
      SELECT venue_id, row, number, COUNT(*) as cnt
      FROM seats
      GROUP BY venue_id, row, number
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      // Delete all duplicates, keeping one with smallest id using subquery
      await queryRunner.query(`
        DELETE FROM seats
        WHERE id IN (
          SELECT id FROM seats s1
          WHERE EXISTS (
            SELECT 1 FROM seats s2
            WHERE s2.venue_id = s1.venue_id
            AND s2.row = s1.row
            AND s2.number = s1.number
            AND s2.id > s1.id
          )
        )
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "seats"
      ADD CONSTRAINT "UQ_seats_venue_row_number" UNIQUE ("venue_id", "row", "number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "seats" DROP CONSTRAINT IF EXISTS "UQ_seats_venue_row_number"
    `);
  }
}
