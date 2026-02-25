/**
 * File metadata for storage operations
 */
export interface FileMetadata {
  contentType: string;
  contentLength: number;
  originalFilename?: string;
}

/**
 * Stored file information
 */
export interface StoredFile {
  /** Unique identifier/key for the stored file */
  key: string;
  /** File metadata */
  metadata: FileMetadata;
  /** Storage location (local path or S3 URL) - internal use only */
  location: string;
}

/**
 * Abstract file storage provider interface.
 * Implementations can be local filesystem, AWS S3, etc.
 */
export interface FileStorageProvider {
  /**
   * Store a file
   * @param key Unique key/path for the file
   * @param content File content as Buffer
   * @param metadata File metadata
   * @returns StoredFile with location info
   */
  store(
    key: string,
    content: Buffer,
    metadata: FileMetadata,
  ): Promise<StoredFile>;

  /**
   * Retrieve file content
   * @param key File key
   * @returns File content as Buffer, or null if not found
   */
  retrieve(key: string): Promise<Buffer | null>;

  /**
   * Delete a file
   * @param key File key
   * @returns true if deleted, false if not found
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if file exists
   * @param key File key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a time-limited access URL (for cloud storage like S3)
   * @param key File key
   * @param expiresInSeconds URL expiration time
   * @returns Signed URL or null if not supported
   */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string | null>;
}

/**
 * Injection token for FileStorageProvider
 */
export const FILE_STORAGE_PROVIDER = 'FILE_STORAGE_PROVIDER';
