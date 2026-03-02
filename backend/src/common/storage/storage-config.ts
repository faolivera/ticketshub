/**
 * S3 storage configuration from environment.
 * Used by StorageModule to build S3FileStorageProvider instances.
 */
export interface StorageConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  privateBucket: string;
  publicBucket: string;
}

/** Default S3 config for local development (LocalStack). */
const DEFAULT_DEV_S3_CONFIG: Omit<StorageConfig, 'endpoint'> & {
  endpoint?: string;
} = {
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  endpoint: 'http://localhost:4567',
  privateBucket: 'ticketshub-private-dev',
  publicBucket: 'ticketshub-public-dev',
};

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Read storage config from process.env.
 * In production all S3 vars are required.
 * In development, missing vars fall back to LocalStack-friendly defaults.
 */
export function getStorageConfig(): StorageConfig {
  const isProd = isProduction();

  const region = process.env.AWS_REGION ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.region);
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.accessKeyId);
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.secretAccessKey);
  const privateBucket =
    process.env.S3_PRIVATE_BUCKET ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.privateBucket);
  const publicBucket =
    process.env.S3_PUBLIC_BUCKET ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.publicBucket);
  const endpoint = process.env.S3_ENDPOINT ?? (isProd ? undefined : DEFAULT_DEV_S3_CONFIG.endpoint);

  if (!region || !accessKeyId || !secretAccessKey || !privateBucket || !publicBucket) {
    throw new Error(
      'Missing required S3 config. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_PRIVATE_BUCKET, S3_PUBLIC_BUCKET. In development these default to LocalStack values.',
    );
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: endpoint || undefined,
    privateBucket,
    publicBucket,
  };
}
