/**
 * API types for transaction chat (buyer-seller messages).
 */

export type ChatSenderRole = 'buyer' | 'seller';

export type ChatMessageType = 'text' | 'delivery';

export interface TransactionChatMessageItem {
  id: string;
  senderId: string;
  senderRole: ChatSenderRole;
  content: string;
  messageType: ChatMessageType;
  payloadType?: string | null;
  createdAt: Date;
}

export interface GetTransactionChatMessagesResponse {
  messages: TransactionChatMessageItem[];
}

export interface PostTransactionChatMessageRequest {
  content: string;
}

export type PostTransactionChatMessageResponse = TransactionChatMessageItem;
