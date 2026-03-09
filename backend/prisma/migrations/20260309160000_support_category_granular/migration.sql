-- Add granular support ticket categories for "report a problem" and dispute flows.
-- Legacy values (transaction, technical) remain for existing rows; new tickets use the new values.
ALTER TYPE "SupportTicketCategory" ADD VALUE 'ticket_not_received';
ALTER TYPE "SupportTicketCategory" ADD VALUE 'ticket_didnt_work';
ALTER TYPE "SupportTicketCategory" ADD VALUE 'buyer_did_not_confirm_receipt';
ALTER TYPE "SupportTicketCategory" ADD VALUE 'payment_issue';
