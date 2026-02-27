import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');

interface Wallet {
  userId: string;
  balance: { amount: number; currency: string };
  pendingBalance: { amount: number; currency: string };
  updatedAt: string;
}

interface TicketUnit {
  id: string;
  status: string;
  seat?: { row: string; seatNumber: string };
}

interface Ticket {
  id: string;
  sellerId: string;
  eventId: string;
  eventDateId: string;
  type: string;
  ticketUnits: TicketUnit[];
  sellTogether: boolean;
  pricePerTicket: { amount: number; currency: string };
  status: string;
  createdAt: string;
  updatedAt: string;
  eventSectionId: string;
}

function emptyJsonFiles(): void {
  const filesToEmpty = [
    'transactions.json',
    'payments.json',
    'pricing-snapshots.json',
    'wallet-transactions.json',
    'payment-confirmations.json',
    'reviews.json',
  ];

  for (const file of filesToEmpty) {
    const filePath = path.join(DATA_DIR, file);
    fs.writeFileSync(filePath, '{}', 'utf-8');
    console.log(`Cleared: ${file}`);
  }
}

function resetWallets(): void {
  const walletsPath = path.join(DATA_DIR, 'wallets.json');
  const wallets: Record<string, Wallet> = JSON.parse(
    fs.readFileSync(walletsPath, 'utf-8'),
  );

  for (const userId of Object.keys(wallets)) {
    const wallet = wallets[userId];
    wallet.balance = { amount: 0, currency: wallet.balance.currency };
    wallet.pendingBalance = { amount: 0, currency: wallet.pendingBalance.currency };
    wallet.updatedAt = new Date().toISOString();
  }

  fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2), 'utf-8');
  console.log(`Reset wallets: ${Object.keys(wallets).length} wallets`);
}

function resetTickets(): void {
  const ticketsPath = path.join(DATA_DIR, 'tickets.json');
  const tickets: Record<string, Ticket> = JSON.parse(
    fs.readFileSync(ticketsPath, 'utf-8'),
  );

  let ticketCount = 0;
  let unitCount = 0;

  for (const ticketId of Object.keys(tickets)) {
    const ticket = tickets[ticketId];
    ticket.status = 'Active';
    ticket.updatedAt = new Date().toISOString();
    ticketCount++;

    for (const unit of ticket.ticketUnits) {
      unit.status = 'available';
      unitCount++;
    }
  }

  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), 'utf-8');
  console.log(`Reset tickets: ${ticketCount} tickets, ${unitCount} units`);
}

function deleteTransactionDocs(): void {
  const docsDir = path.join(DATA_DIR, 'private', 'payment-confirmations');

  if (!fs.existsSync(docsDir)) {
    console.log('No payment-confirmations directory found');
    return;
  }

  const files = fs.readdirSync(docsDir);
  let deletedCount = 0;

  for (const file of files) {
    if (file.startsWith('txn_')) {
      const filePath = path.join(docsDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }

  console.log(`Deleted payment confirmation docs: ${deletedCount} files`);
}

function main(): void {
  console.log('=== Resetting Sales Data ===\n');

  emptyJsonFiles();
  console.log('');

  resetWallets();
  console.log('');

  resetTickets();
  console.log('');

  deleteTransactionDocs();

  console.log('\n=== Reset Complete ===');
}

main();
