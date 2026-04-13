-- AlterTable
ALTER TABLE "exit_tickets" ADD COLUMN     "class_period_id" TEXT;

-- CreateTable
CREATE TABLE "class_periods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_periods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exit_tickets" ADD CONSTRAINT "exit_tickets_class_period_id_fkey" FOREIGN KEY ("class_period_id") REFERENCES "class_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_periods" ADD CONSTRAINT "class_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
