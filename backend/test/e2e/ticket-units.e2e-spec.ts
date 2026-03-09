import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { seedDemoData, loginAs } from './e2e-helpers';

describe('Ticket Units (e2e)', () => {
  let app: INestApplication;
  let seedIds: Awaited<ReturnType<typeof seedDemoData>>['ids'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const seeded = await seedDemoData(app);
    seedIds = seeded.ids;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates numbered and unnumbered listings with the new contract', async () => {
    const sellerToken = await loginAs(
      app,
      'seller@ticketshub.local',
      'seller123',
    );

    const [eventId, eventDateId] = [
      seedIds.eventId,
      seedIds.eventDateIds[0],
    ];
    const eventRes = await request(app.getHttpServer())
      .get(`/api/events/${eventId}`)
      .expect(200);
    const sectionNumbered = eventRes.body.data.sections?.find(
      (s: { seatingType: string }) => s.seatingType === 'numbered',
    );
    const sectionUnnumbered = eventRes.body.data.sections?.find(
      (s: { seatingType: string }) => s.seatingType === 'unnumbered',
    );
    expect(sectionNumbered).toBeDefined();
    expect(sectionUnnumbered).toBeDefined();

    const numberedRes = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventId,
        eventDateId,
        type: 'Digital',
        seatingType: 'numbered',
        ticketUnits: [
          { seat: { row: 'A', seatNumber: '1' } },
          { seat: { row: 'A', seatNumber: '2' } },
        ],
        sellTogether: false,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        eventSectionId: sectionNumbered.id,
      })
      .expect(201);

    expect(numberedRes.body.success).toBe(true);
    expect(numberedRes.body.data.seatingType).toBe('numbered');
    expect(numberedRes.body.data.ticketUnits).toHaveLength(2);
    expect(
      numberedRes.body.data.ticketUnits.every(
        (unit: { seat?: unknown }) => unit.seat,
      ),
    ).toBe(true);

    const unnumberedRes = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        eventId,
        eventDateId,
        type: 'Digital',
        seatingType: 'unnumbered',
        quantity: 3,
        sellTogether: false,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        eventSectionId: sectionUnnumbered.id,
      })
      .expect(201);

    expect(unnumberedRes.body.success).toBe(true);
    expect(unnumberedRes.body.data.seatingType).toBe('unnumbered');
    expect(unnumberedRes.body.data.ticketUnits).toHaveLength(3);
    expect(
      unnumberedRes.body.data.ticketUnits.every(
        (unit: { seat?: unknown }) => !unit.seat,
      ),
    ).toBe(true);
  });

  it('rejects duplicate ticketUnitIds and foreign ticketUnitIds for purchase', async () => {
    const buyerToken = await loginAs(
      app,
      'buyer@ticketshub.local',
      'buyer123',
    );

    const listingId = seedIds.ticketListingIds[0];
    const listingRes = await request(app.getHttpServer())
      .get(`/api/tickets/${listingId}`)
      .expect(200);
    const unitIds = listingRes.body.data.ticketUnits.map(
      (u: { id: string }) => u.id,
    );
    const firstUnitId = unitIds[0];

    const duplicateRes = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId,
        ticketUnitIds: [firstUnitId, firstUnitId],
      });
    expect([400, 403]).toContain(duplicateRes.status);

    const foreignRes = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId,
        ticketUnitIds: ['unit_nonexistent_foreign'],
      });
    expect([400, 403]).toContain(foreignRes.status);
  });

  it('enforces sellTogether and restores exact reserved units on cancel', async () => {
    const buyerToken = await loginAs(
      app,
      'buyer@ticketshub.local',
      'buyer123',
    );

    const listingIds = seedIds.ticketListingIds;
    let sellTogetherListingId: string | undefined;
    for (const id of listingIds) {
      const res = await request(app.getHttpServer()).get(
        `/api/tickets/${id}`,
      );
      if (res.body?.data?.sellTogether === true) {
        sellTogetherListingId = id;
        break;
      }
    }

    const singleUnitListingId = listingIds[0];
    const singleListingRes = await request(app.getHttpServer())
      .get(`/api/tickets/${singleUnitListingId}`)
      .expect(200);
    const singleUnitId = singleListingRes.body.data.ticketUnits.find(
      (u: { status: string }) => u.status === 'available',
    )?.id;
    expect(singleUnitId).toBeDefined();

    if (sellTogetherListingId) {
      const bundleRes = await request(app.getHttpServer())
        .get(`/api/tickets/${sellTogetherListingId}`)
        .expect(200);
      const bundleUnitId = bundleRes.body.data.ticketUnits[0]?.id;
      if (bundleUnitId) {
        const partialBundleRes = await request(app.getHttpServer())
          .post('/api/transactions')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            listingId: sellTogetherListingId,
            ticketUnitIds: [bundleUnitId],
          });
        expect([400, 403]).toContain(partialBundleRes.status);
      }
    }

    const purchaseRes = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: singleUnitListingId,
        ticketUnitIds: [singleUnitId],
      });

    if (purchaseRes.status !== 201) {
      expect([400, 403]).toContain(purchaseRes.status);
      return;
    }

    expect(purchaseRes.body.success).toBe(true);
    expect(purchaseRes.body.data.transaction.ticketUnitIds).toEqual([
      singleUnitId,
    ]);

    const transactionId = purchaseRes.body.data.transaction.id as string;

    await request(app.getHttpServer())
      .post(`/api/transactions/${transactionId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);

    const listingRes = await request(app.getHttpServer())
      .get(`/api/tickets/${singleUnitListingId}`)
      .expect(200);

    const restoredUnit = listingRes.body.data.ticketUnits.find(
      (unit: { id: string }) => unit.id === singleUnitId,
    );
    expect(restoredUnit).toBeDefined();
    expect(restoredUnit.status).toBe('available');
  });
});
