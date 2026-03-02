/**
 * S3 storage configuration shape.
 * Values are read from HOCON (config/*.conf) under storage.*.
 */
export interface StorageConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  privateBucket: string;
  publicBucket: string;
}
