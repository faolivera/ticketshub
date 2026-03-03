import type { Ctx } from '../../common/types/context';
import type { PlatformConfig } from './config.domain';

export interface IConfigRepository {
  findPlatformConfig(ctx: Ctx): Promise<PlatformConfig | null>;
  upsertPlatformConfig(ctx: Ctx, config: PlatformConfig): Promise<PlatformConfig>;
}

export const CONFIG_REPOSITORY = Symbol('IConfigRepository');
