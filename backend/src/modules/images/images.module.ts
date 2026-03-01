import { Module } from '@nestjs/common';
import { ImagesRepository } from './images.repository';
import { IMAGES_REPOSITORY } from './images.repository.interface';

@Module({
  providers: [{ provide: IMAGES_REPOSITORY, useClass: ImagesRepository }],
  exports: [IMAGES_REPOSITORY],
})
export class ImagesModule {}
