import type { Ctx } from '../../common/types/context';
import type {
  TermsVersion,
  UserTermsAcceptance,
  UserTermsState,
} from './terms.domain';
import { TermsUserType } from './terms.domain';

/**
 * Terms repository interface
 */
export interface ITermsRepository {
  /**
   * Find a terms version by ID
   */
  findVersionById(ctx: Ctx, id: string): Promise<TermsVersion | undefined>;

  /**
   * Find the active terms version for a user type
   */
  findActiveByUserType(
    ctx: Ctx,
    userType: TermsUserType,
  ): Promise<TermsVersion | undefined>;

  /**
   * Find acceptance record for a user and terms version (composite key)
   */
  findAcceptance(
    ctx: Ctx,
    userId: string,
    termsVersionId: string,
  ): Promise<UserTermsAcceptance | undefined>;

  /**
   * Find all acceptances for a user, optionally filtered by user type
   */
  findAcceptancesByUser(
    ctx: Ctx,
    userId: string,
    userType?: TermsUserType,
  ): Promise<UserTermsAcceptance[]>;

  /**
   * Create a new acceptance record
   */
  createAcceptance(
    ctx: Ctx,
    data: UserTermsAcceptance,
  ): Promise<UserTermsAcceptance>;

  /**
   * Find user terms state by composite key (userId + userType)
   */
  findUserTermsState(
    ctx: Ctx,
    userId: string,
    userType: TermsUserType,
  ): Promise<UserTermsState | undefined>;

  /**
   * Upsert user terms state (create or update)
   */
  upsertUserTermsState(ctx: Ctx, data: UserTermsState): Promise<UserTermsState>;

  /**
   * Overwrite the HTML content of a terms version
   */
  updateContent(ctx: Ctx, id: string, content: string): Promise<TermsVersion>;
}

/**
 * Injection token for ITermsRepository
 */
export const TERMS_REPOSITORY = Symbol('ITermsRepository');
