import { SetMetadata } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

export const VALIDATE_RESPONSE_KEY = 'validateResponse';
export const ValidateResponse = (schema: ZodTypeAny) =>
  SetMetadata(VALIDATE_RESPONSE_KEY, schema);

