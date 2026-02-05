import { Module } from '@nestjs/common';
import { ImagesRepository } from './images.repository';

@Module({
  providers: [ImagesRepository],
  exports: [ImagesRepository],
})
export class ImagesModule {}

