-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_due_date" TIMESTAMP(3),
ADD COLUMN     "recurrence_frequency" "RecurrenceFrequency",
ADD COLUMN     "recurrence_start_date" TIMESTAMP(3),
ADD COLUMN     "recurrence_template_id" UUID;

-- CreateIndex
CREATE INDEX "expenses_is_recurring_idx" ON "expenses"("is_recurring");

-- CreateIndex
CREATE INDEX "expenses_next_due_date_idx" ON "expenses"("next_due_date");

-- CreateIndex
CREATE INDEX "expenses_recurrence_template_id_idx" ON "expenses"("recurrence_template_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurrence_template_id_fkey" FOREIGN KEY ("recurrence_template_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
