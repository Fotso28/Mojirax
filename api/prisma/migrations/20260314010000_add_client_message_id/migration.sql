-- AlterTable
ALTER TABLE "messages" ADD COLUMN "client_message_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "messages_client_message_id_key" ON "messages"("client_message_id");
