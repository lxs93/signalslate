-- CreateTable
CREATE TABLE "standards" (
    "id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "context" TEXT NOT NULL,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_ticket_standards" (
    "id" TEXT NOT NULL,
    "exit_ticket_id" TEXT NOT NULL,
    "standard_id" TEXT,
    "code" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "exit_ticket_standards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "standards_framework_code_idx" ON "standards"("framework", "code");

-- CreateIndex
CREATE INDEX "exit_ticket_standards_exit_ticket_id_idx" ON "exit_ticket_standards"("exit_ticket_id");

-- AddForeignKey
ALTER TABLE "exit_ticket_standards" ADD CONSTRAINT "exit_ticket_standards_exit_ticket_id_fkey" FOREIGN KEY ("exit_ticket_id") REFERENCES "exit_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_ticket_standards" ADD CONSTRAINT "exit_ticket_standards_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Keep each ticket's free-text standard as a custom tag
INSERT INTO "exit_ticket_standards" ("id", "exit_ticket_id", "standard_id", "code", "order_index")
SELECT gen_random_uuid()::text, "id", NULL, btrim("standard"), 0
FROM "exit_tickets"
WHERE "standard" IS NOT NULL AND btrim("standard") <> '';

-- AlterTable
ALTER TABLE "exit_tickets" DROP COLUMN "standard";
