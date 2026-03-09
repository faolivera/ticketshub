import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export interface SeedIds {
  sellerUserId: string;
  buyerUserId: string;
  eventId: string;
  eventDateIds: string[];
  ticketListingIds: string[];
}

/**
 * Call POST /api/support/dev/seed-demo to create demo users and listings.
 * Requires ENVIRONMENT=test and app.isProduction=false.
 */
export async function seedDemoData(
  app: INestApplication,
): Promise<{ credentials: { seller: { email: string; password: string }; buyer: { email: string; password: string } }; ids: SeedIds }> {
  const res = await request(app.getHttpServer())
    .post('/api/support/dev/seed-demo')
    .expect((r) => {
      if (r.status !== 200 && r.status !== 201) {
        throw new Error(`Expected 200 or 201, got ${r.status}`);
      }
    });
  expect(res.body.success).toBe(true);
  expect(res.body.data).toBeDefined();
  const data = res.body.data;
  return {
    credentials: data.credentials,
    ids: data.ids,
  };
}

/**
 * Login and return the JWT token.
 */
export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const loginRes = await request(app.getHttpServer())
    .post('/api/users/login')
    .send({ email, password })
    .expect(200);
  const token = loginRes.body.data?.token;
  if (!token || typeof token !== 'string') {
    throw new Error(`Login failed for ${email}: no token in response`);
  }
  return token;
}
