import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SupportSeedService } from '../../src/modules/support/support-seed.service';

export interface SeedIds {
  sellerUserId: string;
  buyerUserId: string;
  eventId: string;
  eventDateIds: string[];
  ticketListingIds: string[];
}

const E2E_SEED_CTX = { requestId: 'e2e-seed', userId: undefined } as any;

/**
 * Seed demo data directly via SupportSeedService (no HTTP endpoint exposed).
 */
export async function seedDemoData(
  app: INestApplication,
): Promise<{ credentials: { seller: { email: string; password: string }; buyer: { email: string; password: string } }; ids: SeedIds }> {
  const seedService = app.get(SupportSeedService);
  const data = await seedService.seedDemoData(E2E_SEED_CTX);
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
