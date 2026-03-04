-- AlterTable
ALTER TABLE "transaction_chat_messages" ADD COLUMN     "read_by_buyer_at" TIMESTAMP(3),
ADD COLUMN     "read_by_seller_at" TIMESTAMP(3);
