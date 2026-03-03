import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Image as PrismaImage } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { Image } from './images.domain';
import type { IImagesRepository } from './images.repository.interface';

@Injectable()
export class ImagesRepository implements IImagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(_ctx: Ctx, id: string): Promise<Image | undefined> {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });
    return image ? this.mapToImage(image) : undefined;
  }

  async findByIds(_ctx: Ctx, ids: string[]): Promise<Image[]> {
    if (ids.length === 0) return [];
    const images = await this.prisma.image.findMany({
      where: { id: { in: ids } },
    });
    return images.map((img) => this.mapToImage(img));
  }

  async set(_ctx: Ctx, image: Image): Promise<void> {
    await this.prisma.image.upsert({
      where: { id: image.id },
      update: {
        filename: image.src,
      },
      create: {
        id: image.id,
        filename: image.src,
        contentType: 'image/png',
        sizeBytes: 0,
        uploadedBy: 'system',
      },
    });
  }

  private mapToImage(prismaImage: PrismaImage): Image {
    return {
      id: prismaImage.id,
      src: prismaImage.filename,
    };
  }
}
