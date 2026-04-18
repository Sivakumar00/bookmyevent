import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1776453574786 implements MigrationInterface {
  name = 'Init1776453574786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== VENUES ====================
    await queryRunner.query(`
      CREATE TABLE "venues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "location" character varying NOT NULL,
        "capacity" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venues" PRIMARY KEY ("id")
      )
    `);

    // ==================== EVENTS ====================
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "description" text NOT NULL,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "venue_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'DRAFT',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_events_venue_id" ON "events" ("venue_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "events" ADD CONSTRAINT "FK_events_venue"
      FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // ==================== TICKETS ====================
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "total_quantity" integer NOT NULL,
        "available_quantity" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_event_id" ON "tickets" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tickets_event_type" ON "tickets" ("event_id", "type")`,
    );

    await queryRunner.query(`
      ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_event"
      FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ==================== ORDERS ====================
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_email" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'RESERVED',
        "total_amount" numeric(10,2) NOT NULL,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_orders_user_email" ON "orders" ("user_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status")`,
    );

    // ==================== ORDER ITEMS ====================
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "ticket_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "price_at_purchase" numeric(10,2) NOT NULL,
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_ticket_id" ON "order_items" ("ticket_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ==================== SEATS ====================
    await queryRunner.query(`
      CREATE TABLE "seats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "venue_id" uuid NOT NULL,
        "row" character varying NOT NULL,
        "number" integer NOT NULL,
        CONSTRAINT "PK_seats" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_seats_venue_id" ON "seats" ("venue_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "seats" ADD CONSTRAINT "FK_seats_venue"
      FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ==================== EVENT SEATS ====================
    await queryRunner.query(`
      CREATE TABLE "event_seats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "seat_id" uuid NOT NULL,
        "ticket_id" uuid,
        "status" character varying NOT NULL DEFAULT 'AVAILABLE',
        CONSTRAINT "PK_event_seats" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_event_seats_event_id" ON "event_seats" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_seats_event_status" ON "event_seats" ("event_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_seats_ticket_id" ON "event_seats" ("ticket_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "event_seats" ADD CONSTRAINT "FK_event_seats_event"
      FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "event_seats" ADD CONSTRAINT "FK_event_seats_seat"
      FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "event_seats" ADD CONSTRAINT "FK_event_seats_ticket"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop event_seats constraints and table
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP CONSTRAINT IF EXISTS "FK_event_seats_ticket"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP CONSTRAINT IF EXISTS "FK_event_seats_seat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_seats" DROP CONSTRAINT IF EXISTS "FK_event_seats_event"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "event_seats"`);

    // Drop seats constraints and table
    await queryRunner.query(
      `ALTER TABLE "seats" DROP CONSTRAINT IF EXISTS "FK_seats_venue"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "seats"`);

    // Drop order_items constraints and table
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_ticket"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_order"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);

    // Drop orders table
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);

    // Drop tickets constraints and table
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "FK_tickets_event"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);

    // Drop events constraints and table
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_venue"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);

    // Drop venues table
    await queryRunner.query(`DROP TABLE IF EXISTS "venues"`);
  }
}
