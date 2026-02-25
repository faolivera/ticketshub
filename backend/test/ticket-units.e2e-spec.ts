import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const EXISTING_EVENT_ID = 'evt_1770297832516_6914364f';
const EXISTING_EVENT_DATE_ID = 'edt_1770297832517_8ab73b15';
const SELLER_LISTING_ID = 'tkt_1770297832518_24bf2e7b';
const BUNDLE_LISTING_ID = 'tkt_1771952894596_9761e5c3';

describe('Ticket Units (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string, password: string): Promise<string> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ email, password })
      .expect(200);
    return loginRes.body.data.token as string;
  }

  it('creates numbered and unnumbered listings with the new contract', async () => {
    const sellerToken = await login('seller@ticketshub.local', 'seller123');

    const numberedRes = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventId: EXISTING_EVENT_ID,
        eventDateId: EXISTING_EVENT_DATE_ID,
        type: 'DigitalTransferable',
        seatingType: 'numbered',
        ticketUnits: [
          { seat: { row: 'A', seatNumber: '1' } },
          { seat: { row: 'A', seatNumber: '2' } },
        ],
        sellTogether: false,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        section: 'Test Numbered',
      })
      .expect(201);

    expect(numberedRes.body.success).toBe(true);
    expect(numberedRes.body.data.seatingType).toBe('numbered');
    expect(numberedRes.body.data.ticketUnits).toHaveLength(2);
    expect(numberedRes.body.data.ticketUnits.every((unit: { seat?: unknown }) => unit.seat)).toBe(true);

    const unnumberedRes = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventId: EXISTING_EVENT_ID,
        eventDateId: EXISTING_EVENT_DATE_ID,
        type: 'DigitalTransferable',
        seatingType: 'unnumbered',
        quantity: 3,
        sellTogether: false,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        section: 'Test Unnumbered',
      })
      .expect(201);

    expect(unnumberedRes.body.success).toBe(true);
    expect(unnumberedRes.body.data.seatingType).toBe('unnumbered');
    expect(unnumberedRes.body.data.ticketUnits).toHaveLength(3);
    expect(unnumberedRes.body.data.ticketUnits.every((unit: { seat?: unknown }) => !unit.seat)).toBe(true);
  });

  it('rejects duplicate ticketUnitIds and foreign ticketUnitIds for purchase', async () => {
    const buyerToken = await login('buyer@ticketshub.local', 'buyer123');

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: SELLER_LISTING_ID,
        ticketUnitIds: ['unit_seed_001', 'unit_seed_001'],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: SELLER_LISTING_ID,
        ticketUnitIds: ['unit_seed_005'],
      })
      .expect(400);
  });

  it('enforces sellTogether and restores exact reserved units on cancel', async () => {
    const buyerToken = await login('buyer@ticketshub.local', 'buyer123');

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: BUNDLE_LISTING_ID,
        ticketUnitIds: ['unit_seed_005'],
      })
      .expect(400);

    const purchaseRes = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: SELLER_LISTING_ID,
        ticketUnitIds: ['unit_seed_001'],
      })
      .expect(201);

    expect(purchaseRes.body.success).toBe(true);
    expect(purchaseRes.body.data.transaction.ticketUnitIds).toEqual(['unit_seed_001']);

    const transactionId = purchaseRes.body.data.transaction.id as string;

    await request(app.getHttpServer())
      .post(`/api/transactions/${transactionId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);

    const listingRes = await request(app.getHttpServer())
      .get(`/api/tickets/${SELLER_LISTING_ID}`)
      .expect(200);

    const restoredUnit = listingRes.body.data.ticketUnits.find(
      (unit: { id: string }) => unit.id === 'unit_seed_001',
    );
    expect(restoredUnit.status).toBe('available');
  });
});
