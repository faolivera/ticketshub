import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { seedDemoData, loginAs } from './e2e-helpers';

describe('MyTickets (e2e)', () => {
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

  it('unauthenticated GET /api/my-tickets returns 401', () => {
    return request(app.getHttpServer()).get('/api/my-tickets').expect(401);
  });

  it('authenticated GET /api/my-tickets returns 200 with bought/sold/listed arrays', async () => {
    const token = await loginAs(
      app,
      'seller@ticketshub.local',
      'seller123',
    );

    const myTicketsRes = await request(app.getHttpServer())
      .get('/api/my-tickets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { success, data } = myTicketsRes.body;
    expect(success).toBe(true);
    expect(data).toBeDefined();
    expect(data).toHaveProperty('bought');
    expect(data).toHaveProperty('sold');
    expect(data).toHaveProperty('listed');
    expect(Array.isArray(data.bought)).toBe(true);
    expect(Array.isArray(data.sold)).toBe(true);
    expect(Array.isArray(data.listed)).toBe(true);
    expect(data.listed.length).toBeGreaterThan(0);
    expect(
      data.listed.every(
        (listing: { sellerId: string }) => listing.sellerId === seedIds.sellerUserId,
      ),
    ).toBe(true);
  });
});
