import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaStorageService } from './media-storage.service';

const allowedProductImageMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const allowedCampaignMediaMimeTypes = [
  ...allowedProductImageMimeTypes,
  'video/mp4',
  'video/webm',
];

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_request, file, callback) => {
        if (!allowedProductImageMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Format image non supporté. Utilisez JPG, PNG ou WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadProductImage(
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucune image reçue.');
    }

    const storedMedia =
      await this.mediaStorageService.uploadProductImage(file);

    return {
      url: storedMedia.url,
      storagePath: storedMedia.storagePath,
      filename: storedMedia.filename,
    };
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_request, file, callback) => {
        if (!allowedCampaignMediaMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Format média non supporté. Utilisez JPG, PNG, WEBP, MP4 ou WEBM.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        files: 1,
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  async uploadCampaignMedia(
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun média reçu.');
    }

    const storedMedia =
      await this.mediaStorageService.uploadCampaignMedia(file);

    return {
      url: storedMedia.url,
      storagePath: storedMedia.storagePath,
      filename: storedMedia.filename,
      mediaType: storedMedia.mediaType,
    };
  }
}
