import * as path from 'path';
import { Logger } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { Ctx, ON_APP_INIT_CTX } from '../types/context';
import { ContextLogger } from '../logger/context-logger';

export class KeyValueFileStorage<T> {
  private readonly logger: ContextLogger = new ContextLogger(
    KeyValueFileStorage.name,
  );
  private data: Record<string, T> = {};
  private readonly storage: FileStorage<Record<string, T>>;

  constructor(private readonly tableName: string) {
    const filePath = path.join(process.cwd(), 'data', `${tableName}.json`);
    this.storage = new FileStorage<Record<string, T>>(filePath);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      ON_APP_INIT_CTX,
      `Initializing storage for table: ${this.tableName}`,
    );
    const data = await this.storage.read();
    if (data) {
      this.data = data;
      const keyCount = Object.keys(this.data).length;
      this.logger.log(
        ON_APP_INIT_CTX,
        `Loaded ${keyCount} entries from ${this.tableName}`,
      );
    } else {
      this.logger.log(
        ON_APP_INIT_CTX,
        `No existing data found for ${this.tableName}, starting with empty storage`,
      );
    }
  }
  async set(ctx: Ctx, key: string, value: T): Promise<void> {
    this.logger.log(ctx, `Setting key "${key}" in ${this.tableName}`);
    this.data[key] = this.deepCopy(value);
    await this.storage.persist(this.data);
    this.logger.debug(
      ctx,
      `Successfully persisted key "${key}" in ${this.tableName}`,
    );
  }

  async get(ctx: Ctx, key: string): Promise<T | undefined> {
    const exists = key in this.data;
    this.logger.debug(
      ctx,
      `Getting key "${key}" from ${this.tableName} - ${exists ? 'found' : 'not found'}`,
    );
    return this.data[key] ? this.deepCopy(this.data[key]) : undefined;
  }

  async getMany(ctx: Ctx, keys: string[]): Promise<T[]> {
    const foundKeys = keys.filter((key) => key in this.data);
    const count = foundKeys.length;
    this.logger.debug(
      ctx,
      `Getting ${count} entries from ${this.tableName} - ${count} entries found: ${foundKeys.join(', ')}`,
    );
    return foundKeys.map((key) => this.deepCopy(this.data[key])) as T[];
  }

  async getAll(ctx: Ctx): Promise<T[]> {
    const count = Object.keys(this.data).length;
    this.logger.debug(
      ctx,
      `Getting all entries from ${this.tableName} - ${count} entries found`,
    );
    return Object.values(this.data).map(this.deepCopy);
  }

  async delete(ctx: Ctx, key: string): Promise<void> {
    const exists = key in this.data;
    if (exists) {
      this.logger.log(ctx, `Deleting key "${key}" from ${this.tableName}`);
      delete this.data[key];
      await this.storage.persist(this.data);
      this.logger.debug(
        ctx,
        `Successfully deleted key "${key}" from ${this.tableName}`,
      );
    } else {
      this.logger.warn(
        ctx,
        `Attempted to delete non-existent key "${key}" from ${this.tableName}`,
      );
    }
  }

  async deleteAll(ctx: Ctx): Promise<void> {
    const count = Object.keys(this.data).length;
    this.logger.warn(
      ctx,
      `Deleting all ${count} entries from ${this.tableName}`,
    );
    this.data = {};
    await this.storage.persist(this.data);
    this.logger.log(
      ctx,
      `Successfully deleted all entries from ${this.tableName}`,
    );
  }

  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
