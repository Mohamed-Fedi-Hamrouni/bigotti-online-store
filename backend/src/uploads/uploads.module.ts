import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AzureBlobStorageService } from './azure-blob-storage.service';
import { LocalMediaStorageService } from './local-media-storage.service';
import { MediaStorageService } from './media-storage.service';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    AzureBlobStorageService,
    LocalMediaStorageService,
    MediaStorageService,
  ],
  exports: [MediaStorageService],
})
export class UploadsModule {}
