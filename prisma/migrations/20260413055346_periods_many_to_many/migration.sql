/*
  Warnings:

  - You are about to drop the column `class_period_id` on the `exit_tickets` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "exit_tickets" DROP CONSTRAINT "exit_tickets_class_period_id_fkey";

-- AlterTable
ALTER TABLE "exit_tickets" DROP COLUMN "class_period_id";

-- CreateTable
CREATE TABLE "_ClassPeriodToExitTicket" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassPeriodToExitTicket_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ClassPeriodToExitTicket_B_index" ON "_ClassPeriodToExitTicket"("B");

-- AddForeignKey
ALTER TABLE "_ClassPeriodToExitTicket" ADD CONSTRAINT "_ClassPeriodToExitTicket_A_fkey" FOREIGN KEY ("A") REFERENCES "class_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassPeriodToExitTicket" ADD CONSTRAINT "_ClassPeriodToExitTicket_B_fkey" FOREIGN KEY ("B") REFERENCES "exit_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
