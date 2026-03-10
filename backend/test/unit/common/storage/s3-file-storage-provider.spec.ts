import { S3FileStorageProvider } from '../../../../src/common/storage/s3-file-storage-provider';
import type { StorageConfig } from '../../../../src/common/storage/storage-config';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((opts: unknown) => ({ _put: opts })),
  GetObjectCommand: jest
    .fn()
    .mockImplementation((opts: unknown) => ({ _get: opts })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((opts: unknown) => ({ _del: opts })),
  HeadObjectCommand: jest
    .fn()
    .mockImplementation((opts: unknown) => ({ _head: opts })),
  CreateBucketCommand: jest
    .fn()
    .mockImplementation((opts: unknown) => ({ _create: opts })),
}));

describe('S3FileStorageProvider', () => {
  const config: StorageConfig = {
    region: 'us-east-1',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    privateBucket: 'test-private',
    publicBucket: 'test-public',
  };

  const configWithEndpoint: StorageConfig = {
    ...config,
    endpoint: 'http://localhost:4567',
  };

  let provider: S3FileStorageProvider;

  beforeEach(() => {
    mockSend.mockReset();
  });

  describe('without endpoint (production)', () => {
    beforeEach(() => {
      provider = new S3FileStorageProvider({ bucket: 'my-bucket', config });
    });

    it('should not call CreateBucket on store', async () => {
      mockSend.mockResolvedValue({});
      await provider.store('path/file.txt', Buffer.from('data'), {
        contentType: 'text/plain',
        contentLength: 4,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return StoredFile with s3 location', async () => {
      mockSend.mockResolvedValue({});
      const result = await provider.store(
        'path/file.txt',
        Buffer.from('data'),
        {
          contentType: 'text/plain',
          contentLength: 4,
        },
      );
      expect(result).toEqual({
        key: 'path/file.txt',
        metadata: { contentType: 'text/plain', contentLength: 4 },
        location: 's3://my-bucket/path/file.txt',
      });
    });

    it('should retrieve file content', async () => {
      const body = (async function* () {
        yield new Uint8Array([1, 2, 3]);
      })();
      mockSend.mockResolvedValue({ Body: body });
      const result = await provider.retrieve('path/file.txt');
      expect(result).toEqual(Buffer.from([1, 2, 3]));
    });

    it('should return null when key not found on retrieve', async () => {
      mockSend.mockRejectedValue({ name: 'NoSuchKey' });
      const result = await provider.retrieve('path/missing.txt');
      expect(result).toBeNull();
    });

    it('should return true on delete', async () => {
      mockSend.mockResolvedValue({});
      const result = await provider.delete('path/file.txt');
      expect(result).toBe(true);
    });

    it('should return true when object exists', async () => {
      mockSend.mockResolvedValue({});
      const result = await provider.exists('path/file.txt');
      expect(result).toBe(true);
    });

    it('should return false when object does not exist', async () => {
      mockSend.mockRejectedValue({ name: 'NotFound' });
      const result = await provider.exists('path/missing.txt');
      expect(result).toBe(false);
    });

    it('should return public S3 URL from getPublicUrl', () => {
      const url = provider.getPublicUrl('path/file.txt');
      expect(url).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/path/file.txt');
    });

    it('should return signed URL from getSignedUrl', async () => {
      const url = await provider.getSignedUrl('path/file.txt', 3600);
      expect(url).toBe('https://s3.example.com/signed-url');
    });
  });

  describe('with endpoint (LocalStack)', () => {
    beforeEach(() => {
      provider = new S3FileStorageProvider({
        bucket: 'local-bucket',
        config: configWithEndpoint,
      });
    });

    it('should call CreateBucket then PutObject on first store', async () => {
      mockSend.mockResolvedValue({});
      await provider.store('path/file.txt', Buffer.from('data'), {
        contentType: 'text/plain',
        contentLength: 4,
      });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should return location with endpoint prefix', async () => {
      mockSend.mockResolvedValue({});
      const result = await provider.store(
        'path/file.txt',
        Buffer.from('data'),
        {
          contentType: 'text/plain',
          contentLength: 4,
        },
      );
      expect(result.location).toBe(
        'http://localhost:4567/local-bucket/path/file.txt',
      );
    });

    it('should return localstack URL from getPublicUrl', () => {
      const url = provider.getPublicUrl('path/file.txt');
      expect(url).toBe('http://localhost:4567/local-bucket/path/file.txt');
    });
  });
});
