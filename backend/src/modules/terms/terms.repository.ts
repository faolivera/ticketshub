import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type {
  TermsVersion,
  UserTermsAcceptance,
  UserTermsState,
} from './terms.domain';
import { TermsStatus, TermsUserType } from './terms.domain';

@Injectable()
export class TermsRepository implements OnModuleInit {
  private readonly versionsStorage: KeyValueFileStorage<TermsVersion>;
  private readonly acceptancesStorage: KeyValueFileStorage<UserTermsAcceptance>;
  private readonly statesStorage: KeyValueFileStorage<UserTermsState>;

  constructor() {
    this.versionsStorage = new KeyValueFileStorage<TermsVersion>(
      'terms-versions',
    );
    this.acceptancesStorage = new KeyValueFileStorage<UserTermsAcceptance>(
      'user-terms-acceptances',
    );
    this.statesStorage = new KeyValueFileStorage<UserTermsState>(
      'user-terms-states',
    );
  }

  async onModuleInit(): Promise<void> {
    await this.versionsStorage.onModuleInit();
    await this.acceptancesStorage.onModuleInit();
    await this.statesStorage.onModuleInit();
  }

  async findVersionById(
    ctx: Ctx,
    id: string,
  ): Promise<TermsVersion | undefined> {
    return await this.versionsStorage.get(ctx, id);
  }

  async findActiveByUserType(
    ctx: Ctx,
    userType: TermsUserType,
  ): Promise<TermsVersion | undefined> {
    const allVersions = await this.versionsStorage.getAll(ctx);
    return allVersions.find(
      (v) => v.userType === userType && v.status === TermsStatus.Active,
    );
  }

  async findAcceptance(
    ctx: Ctx,
    userId: string,
    termsVersionId: string,
  ): Promise<UserTermsAcceptance | undefined> {
    const key = `${userId}-${termsVersionId}`;
    return await this.acceptancesStorage.get(ctx, key);
  }

  async findAcceptancesByUser(
    ctx: Ctx,
    userId: string,
    userType?: TermsUserType,
  ): Promise<UserTermsAcceptance[]> {
    const allAcceptances = await this.acceptancesStorage.getAll(ctx);
    return allAcceptances.filter(
      (a) =>
        a.userId === userId && (userType === undefined || a.userType === userType),
    );
  }

  async createAcceptance(
    ctx: Ctx,
    data: UserTermsAcceptance,
  ): Promise<UserTermsAcceptance> {
    const key = `${data.userId}-${data.termsVersionId}`;
    await this.acceptancesStorage.set(ctx, key, data);
    return data;
  }

  async findUserTermsState(
    ctx: Ctx,
    userId: string,
    userType: TermsUserType,
  ): Promise<UserTermsState | undefined> {
    const key = `${userId}-${userType}`;
    return await this.statesStorage.get(ctx, key);
  }

  async upsertUserTermsState(
    ctx: Ctx,
    data: UserTermsState,
  ): Promise<UserTermsState> {
    const key = `${data.userId}-${data.userType}`;
    await this.statesStorage.set(ctx, key, data);
    return data;
  }
}
