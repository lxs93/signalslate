-- AlterTable
ALTER TABLE "exit_tickets" ADD COLUMN     "ask_confidence" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "confidence" INTEGER;

