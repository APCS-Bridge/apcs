-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'SPACE_INVITATION_RECEIVED',
  'INVITATION_ACCEPTED',
  'INVITATION_DENIED',
  'BACKLOG_ITEM_CREATED',
  'BACKLOG_ITEM_ASSIGNED',
  'BACKLOG_ITEM_UPDATED',
  'SPRINT_CREATED',
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
  'SPRINT_UPDATED',
  'SPRINT_BACKLOG_ITEM_CREATED',
  'SPRINT_BACKLOG_ITEM_ASSIGNED',
  'SPRINT_BACKLOG_ITEM_UPDATED',
  'TASK_ASSIGNED',
  'TASK_UPDATED',
  'TASK_COMPLETED',
  'TASK_COMMENT_ADDED',
  'MEETING_SCHEDULED',
  'MEETING_REMINDER',
  'MEETING_UPDATED',
  'MEETING_CANCELLED',
  'DAILY_STANDUP_REMINDER',
  'SPRINT_DEADLINE_REMINDER',
  'MESSAGE_RECEIVED',
  'MENTION_RECEIVED'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
