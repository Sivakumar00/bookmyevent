import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeatBasedTicketingSchema1713520000000
  implements MigrationInterface
{
  name = 'SeatBasedTicketingSchema1713520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove quantity columns from tickets
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "total_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "available_quantity"`,
    );

    // 2. Add expires_at to event_seats
    await queryRunner.query(
      `ALTER TABLE "event_seats" ADD "expires_at" TIMESTAMP`,
    );

    // 3. Add index on (event_id, status) to event_seats (skip if already exists)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_event_seats_event_status" ON "event_seats" ("event_id", "status")`,
    );

    // 4. Add unique constraint on (event_id, seat_id) to event_seats
    await queryRunner.query(
      `ALTER TABLE "event_seats" ADD CONSTRAINT IF NOT EXISTS "UQ_event_seats_event_seat" UNIQUE ("event_id", "seat_id")`,
    );

    // 5. Update order_items: drop ticket_id, quantity, add event_seat_id
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN IF EXISTS "ticket_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN IF EXISTS "quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "event_seat_id" UUID NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_event_seat" FOREIGN KEY ("event_seat_id") REFERENCES "event_seats"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback order_items
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_event_seat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN IF EXISTS "event_seat_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "ticket_id" UUID NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "quantity" int NOT NULL`,
    );

    // Rollback event_seats
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP CONSTRAINT IF EXISTS "UQ_event_seats_event_seat"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_event_seats_event_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP COLUMN IF EXISTS "expires_at"`,
    );

    // Rollback tickets
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD "total_quantity" int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD "available_quantity" int NOT NULL DEFAULT 0`,
    );
  }
}
