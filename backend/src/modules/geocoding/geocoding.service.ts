import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { GeocodingTokenPayload } from './geocoding.domain';

const GEOCODING_JWT_SECRET =
  process.env.GEOCODING_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'your-secret-key-change-in-production';

@Injectable()
export class GeocodingService {
  decodeToken(token: string): GeocodingTokenPayload | null {
    try {
      return jwt.verify(token, GEOCODING_JWT_SECRET) as GeocodingTokenPayload;
    } catch {
      return null;
    }
  }
}

