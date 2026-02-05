import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ImagesModule } from '../images/images.module';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [ImagesModule, GeocodingModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}

