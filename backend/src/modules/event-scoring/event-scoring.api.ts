/**
 * API types for event ranking config (admin).
 */

/** Response for GET /api/admin/events-ranking/config */
export interface GetEventsRankingConfigResponse {
  weightActiveListings: number;
  weightTransactions: number;
  weightProximity: number;
  weightPopular: number;
  jobIntervalMinutes: number;
  lastRunAt: string | null;
  updatedAt: string;
}

/** Request body for PATCH /api/admin/events-ranking/config. All fields optional. */
export interface PatchEventsRankingConfigRequest {
  weightActiveListings?: number;
  weightTransactions?: number;
  weightProximity?: number;
  weightPopular?: number;
  jobIntervalMinutes?: number;
}
