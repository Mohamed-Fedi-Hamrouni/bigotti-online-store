import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AzureBlobStorageService } from './azure-blob-storage.service';
import { LocalMediaStorageService } from './local-media-storage.service';
import type {
  DetectedMedia,
  MediaFolder,
  StoredMedia,
} from './media-storage.types';

const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const CAMPAIGN_MEDIA_MAX_SIZE = 25 * 1024 * 1024;

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly storageDriver: 'local' | 'azure';

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorage: LocalMediaStorageService,
    private readonly azureStorage: AzureBlobStorageService,
  ) {
    this.storageDriver = this.configService.get<'local' | 'azure'>(
      'STORAGE_DRIVER',
      'local',
    );
  }

  async uploadProductImage(
    file: Express.Multer.File,
  ): Promise<StoredMedia> {
    const detectedMedia = this.validateFile(
      file,
      PRODUCT_IMAGE_MAX_SIZE,
      false,
    );

    return this.upload('products', file, detectedMedia);
  }

  async uploadCampaignMedia(
    file: Express.Multer.File,
  ): Promise<StoredMedia> {
    const detectedMedia = this.validateFile(
      file,
      CAMPAIGN_MEDIA_MAX_SIZE,
      true,
    );

    return this.upload('campaigns', file, detectedMedia);
  }

  async delete(storagePath: string | null | undefined) {
    const normalizedPath = storagePath?.trim();

    if (!normalizedPath) {
      return false;
    }

    if (this.azureStorage.supports(normalizedPath)) {
      return this.azureStorage.delete(normalizedPath);
    }

    if (this.localStorage.supports(normalizedPath)) {
      return this.localStorage.delete(normalizedPath);
    }

    return false;
  }

  async deleteMany(storagePaths: Array<string | null | undefined>) {
    const uniquePaths = [
      ...new Set(
        storagePaths
          .map((storagePath) => storagePath?.trim())
          .filter((storagePath): storagePath is string =>
            Boolean(storagePath),
          ),
      ),
    ];

    const results = await Promise.allSettled(
      uniquePaths.map((storagePath) => this.delete(storagePath)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Impossible de supprimer le média ${uniquePaths[index]}.`,
          result.reason instanceof Error
            ? result.reason.stack
            : String(result.reason),
        );
      }
    });
  }

  private async upload(
    folder: MediaFolder,
    file: Express.Multer.File,
    detectedMedia: DetectedMedia,
  ) {
    const filename = `${randomUUID()}.${detectedMedia.extension}`;

    const input = {
      folder,
      filename,
      buffer: file.buffer,
      mimeType: detectedMedia.mimeType,
      mediaType: detectedMedia.kind,
    } as const;

    if (this.storageDriver === 'azure') {
      return this.azureStorage.upload(input);
    }

    return this.localStorage.upload(input);
  }

  private validateFile(
    file: Express.Multer.File,
    maximumSize: number,
    allowVideo: boolean,
  ): DetectedMedia {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Le fichier reçu est vide.');
    }

    if (file.size <= 0 || file.size > maximumSize) {
      throw new BadRequestException(
        `Le fichier dépasse la taille maximale de ${Math.floor(
          maximumSize / 1024 / 1024,
        )} Mo.`,
      );
    }

    const detectedMedia = this.detectMedia(file.buffer);

    if (!detectedMedia) {
      throw new BadRequestException(
        allowVideo
          ? 'Format non reconnu. Utilisez JPG, PNG, WEBP, MP4 ou WEBM.'
          : 'Format image non reconnu. Utilisez JPG, PNG ou WEBP.',
      );
    }

    if (!allowVideo && detectedMedia.kind === 'VIDEO') {
      throw new BadRequestException(
        'Les vidéos ne sont pas autorisées pour les images produit.',
      );
    }

    const declaredMimeType =
      file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;

    if (declaredMimeType !== detectedMedia.mimeType) {
      throw new BadRequestException(
        'Le contenu du fichier ne correspond pas à son type MIME déclaré.',
      );
    }

    return detectedMedia;
  }

  private detectMedia(buffer: Buffer): DetectedMedia | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return {
        mimeType: 'image/jpeg',
        extension: 'jpg',
        kind: 'IMAGE',
      };
    }

    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    ) {
      return {
        mimeType: 'image/png',
        extension: 'png',
        kind: 'IMAGE',
      };
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return {
        mimeType: 'image/webp',
        extension: 'webp',
        kind: 'IMAGE',
      };
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 4, 8) === 'ftyp'
    ) {
      return {
        mimeType: 'video/mp4',
        extension: 'mp4',
        kind: 'VIDEO',
      };
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return {
        mimeType: 'video/webm',
        extension: 'webm',
        kind: 'VIDEO',
      };
    }

    return null;
  }
}
