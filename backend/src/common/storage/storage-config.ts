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
  /** When set, public asset URLs use this CloudFront base URL instead of the default S3 URL (e.g. https://d1234abcd.cloudfront.net). */
  cloudfrontBaseUrl?: string;
  privateBucket: string;
  publicBucket: string;
}
