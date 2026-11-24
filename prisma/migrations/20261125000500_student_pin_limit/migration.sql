-- AlterTable
ALTER TABLE "students" ADD COLUMN     "failed_pin_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin_locked_until" TIMESTAMP(3);

