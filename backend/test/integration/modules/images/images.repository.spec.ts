import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ImagesRepository } from '@/modules/images/images.repository';
import type { Image } from '@/modules/images/images.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('ImagesRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: ImagesRepository;
  let ctx: Ctx;

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new ImagesRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('findById', () => {
    it('should return undefined when image does not exist', async () => {
      const found = await repository.findById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find image by id after set', async () => {
      const image: Image = { id: randomUUID(), src: 'path/to/image.png' };
      await repository.set(ctx, image);
      const found = await repository.findById(ctx, image.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(image.id);
      expect(found?.src).toBe(image.src);
    });
  });

  describe('findByIds', () => {
    it('should return empty array when no ids provided', async () => {
      const images = await repository.findByIds(ctx, []);
      expect(images).toEqual([]);
    });

    it('should return empty array when no matches', async () => {
      const images = await repository.findByIds(ctx, ['non-existent-1', 'non-existent-2']);
      expect(images).toEqual([]);
    });

    it('should find multiple images by ids', async () => {
      const img1: Image = { id: randomUUID(), src: 'src1.png' };
      const img2: Image = { id: randomUUID(), src: 'src2.png' };
      await repository.set(ctx, img1);
      await repository.set(ctx, img2);
      const images = await repository.findByIds(ctx, [img1.id, img2.id]);
      expect(images).toHaveLength(2);
      expect(images.map(i => i.id).sort()).toEqual([img1.id, img2.id].sort());
    });
  });

  describe('set', () => {
    it('should create new image', async () => {
      const image: Image = { id: randomUUID(), src: 'new-image.png' };
      await repository.set(ctx, image);
      const found = await repository.findById(ctx, image.id);
      expect(found?.src).toBe('new-image.png');
    });

    it('should update existing image', async () => {
      const image: Image = { id: randomUUID(), src: 'original.png' };
      await repository.set(ctx, image);
      await repository.set(ctx, { ...image, src: 'updated.png' });
      const found = await repository.findById(ctx, image.id);
      expect(found?.src).toBe('updated.png');
    });
  });
});
