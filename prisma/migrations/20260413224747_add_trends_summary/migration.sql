-- CreateTable
CREATE TABLE "trends_summaries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_id" TEXT,
    "overall_summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "misconceptions" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trends_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trends_summaries_user_id_period_id_key" ON "trends_summaries"("user_id", "period_id");

-- AddForeignKey
ALTER TABLE "trends_summaries" ADD CONSTRAINT "trends_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
