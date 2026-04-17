import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1776453574786 implements MigrationInterface {
  name = 'Init1776453574786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "venues" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "location" character varying NOT NULL, "capacity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cb0f885278d12384eb7a81818be" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text NOT NULL, "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP NOT NULL, "venue_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "type" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "total_quantity" integer NOT NULL, "available_quantity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_email" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'RESERVED', "total_amount" numeric(10,2) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "ticket_id" uuid NOT NULL, "quantity" integer NOT NULL, "price_at_purchase" numeric(10,2) NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_26e10dc1ae5cdd5a20279e08b4a" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_bd5387c23fb40ae7e3526ad75ea" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking_items" ADD CONSTRAINT "FK_14d6d26343634ee91fb9cf486ba" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_items" DROP CONSTRAINT IF EXISTS "FK_14d6d26343634ee91fb9cf486ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_items" DROP CONSTRAINT IF EXISTS "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "FK_bd5387c23fb40ae7e3526ad75ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_26e10dc1ae5cdd5a20279e08b4a"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venues"`);
  }
}
