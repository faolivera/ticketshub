-- AlterTable: add seller_sent_payload_type to transactions (how seller sent the ticket: qr, pdf, text)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "seller_sent_payload_type" TEXT;

-- AlterTable: add message_type and payload_type to transaction_chat_messages for structured delivery events
ALTER TABLE "transaction_chat_messages" ADD COLUMN IF NOT EXISTS "message_type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "transaction_chat_messages" ADD COLUMN IF NOT EXISTS "payload_type" TEXT;
