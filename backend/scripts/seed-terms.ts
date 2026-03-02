import { PrismaClient, TermsUserType, TermsStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { loadHoconConfig } from '../src/config/load-hocon';

const config = loadHoconConfig() as { database?: { url?: string } };
const connectionString = config.database?.url;
if (!connectionString) {
  console.error('database.url is required. Set DATABASE_URL or configure in config/*.conf');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BUYER_TERMS_CONTENT = `
# Terms and Conditions for Buyers

Last updated: ${new Date().toISOString().split('T')[0]}

## 1. Acceptance of Terms

By creating an account and purchasing tickets through TicketsHub, you agree to be bound by these Terms and Conditions.

## 2. Ticket Purchases

- All ticket purchases are final and non-refundable unless the event is cancelled.
- Tickets are subject to availability and pricing may change without notice.
- You are responsible for verifying event details before completing your purchase.

## 3. User Responsibilities

- You must provide accurate and complete information when creating your account.
- You are responsible for maintaining the confidentiality of your account credentials.
- You agree not to use the platform for any fraudulent or illegal activities.

## 4. Payment

- All payments must be made through the approved payment methods available on the platform.
- Prices are displayed in the local currency and include applicable fees.

## 5. Ticket Transfer

- Purchased tickets may be transferred according to the platform's transfer policies.
- The original purchaser remains responsible for any issues related to transferred tickets.

## 6. Limitation of Liability

TicketsHub acts as an intermediary between buyers and sellers. We are not responsible for:
- Event cancellations or changes made by event organizers.
- Issues arising from tickets purchased from third-party sellers.
- Any damages or losses incurred as a result of using our platform.

## 7. Contact

For questions about these terms, please contact our support team.
`;

const SELLER_TERMS_CONTENT = `
# Terms and Conditions for Sellers

Last updated: ${new Date().toISOString().split('T')[0]}

## 1. Acceptance of Terms

By registering as a seller on TicketsHub, you agree to be bound by these Terms and Conditions.

## 2. Seller Requirements

- You must be of legal age in your jurisdiction to sell tickets.
- You must have the legal right to sell the tickets you list.
- All ticket listings must be accurate and truthful.

## 3. Listing Tickets

- All tickets listed must be authentic and valid for the stated event.
- You are responsible for setting fair and reasonable prices.
- Listings that violate our policies may be removed without notice.

## 4. Sales and Payments

- Sales are processed through our secure payment system.
- Funds will be released according to our payment schedule.
- A platform fee will be deducted from each successful sale.

## 5. Seller Responsibilities

- You must deliver tickets to buyers in a timely manner.
- You must respond to buyer inquiries promptly.
- You are responsible for any issues related to the authenticity of your tickets.

## 6. Prohibited Activities

- Selling counterfeit or invalid tickets.
- Price gouging or unfair pricing practices.
- Any fraudulent or deceptive activities.

## 7. Account Termination

TicketsHub reserves the right to suspend or terminate seller accounts that violate these terms.

## 8. Contact

For questions about these terms, please contact our seller support team.
`;

async function seedTerms(): Promise<void> {
  console.log('=== Seeding Terms and Conditions ===\n');

  const existingBuyerTerms = await prisma.termsVersion.findFirst({
    where: {
      userType: TermsUserType.buyer,
      status: TermsStatus.active,
    },
  });

  const existingSellerTerms = await prisma.termsVersion.findFirst({
    where: {
      userType: TermsUserType.seller,
      status: TermsStatus.active,
    },
  });

  if (existingBuyerTerms) {
    console.log('Active buyer terms already exist (id: %s)', existingBuyerTerms.id);
  } else {
    const buyerTerms = await prisma.termsVersion.create({
      data: {
        userType: TermsUserType.buyer,
        version: '1.0',
        content: BUYER_TERMS_CONTENT.trim(),
        status: TermsStatus.active,
        publishedAt: new Date(),
      },
    });
    console.log('Created buyer terms (id: %s)', buyerTerms.id);
  }

  if (existingSellerTerms) {
    console.log('Active seller terms already exist (id: %s)', existingSellerTerms.id);
  } else {
    const sellerTerms = await prisma.termsVersion.create({
      data: {
        userType: TermsUserType.seller,
        version: '1.0',
        content: SELLER_TERMS_CONTENT.trim(),
        status: TermsStatus.active,
        publishedAt: new Date(),
      },
    });
    console.log('Created seller terms (id: %s)', sellerTerms.id);
  }

  console.log('\n=== Seeding Complete ===');
}

seedTerms()
  .catch((error) => {
    console.error('Error seeding terms:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
