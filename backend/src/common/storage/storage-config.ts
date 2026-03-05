/**
 * S3 storage configuration shape.
 * Values are read from HOCON (config/*.conf) under storage.*.
 */
export interface StorageConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Internal endpoint for S3 API calls (e.g. http://localstack:4566 from inside Docker). */
  endpoint?: string;
  /** When set, signed URLs use this host so the client (e.g. browser) can reach S3/LocalStack (e.g. http://localhost:4567). */
  signedUrlEndpoint?: string;
  privateBucket: string;
  publicBucket: string;
}
