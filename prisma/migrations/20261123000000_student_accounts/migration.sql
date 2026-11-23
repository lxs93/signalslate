-- AlterTable
ALTER TABLE "class_periods" ADD COLUMN     "join_code" TEXT;
-- Backfill a code for existing periods
UPDATE "class_periods" SET "join_code" = upper(substr(md5(random()::text || "id"), 1, 6));
ALTER TABLE "class_periods" ALTER COLUMN "join_code" SET NOT NULL;

-- AlterTable
ALTER TABLE "follow_up_flags" ADD COLUMN     "student_id" UUID;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "student_id" UUID;

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "google_sub" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "student_id" UUID NOT NULL,
    "period_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("student_id","period_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_google_sub_key" ON "students"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "class_periods_join_code_key" ON "class_periods"("join_code");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_exit_ticket_id_student_id_key" ON "submissions"("exit_ticket_id", "student_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "class_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_flags" ADD CONSTRAINT "follow_up_flags_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
