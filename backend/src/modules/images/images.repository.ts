import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { Image } from './images.domain';

@Injectable()
export class ImagesRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<Image>;

  constructor() {
    this.storage = new KeyValueFileStorage<Image>('images');
  }

  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  async getById(ctx: Ctx, id: string): Promise<Image | undefined> {
    return await this.storage.get(ctx, id);
  }

  async getByIds(ctx: Ctx, ids: string[]): Promise<Image[]> {
    return await this.storage.getMany(ctx, ids);
  }

  async set(ctx: Ctx, image: Image): Promise<void> {
    await this.storage.set(ctx, image.id, image);
  }
}

