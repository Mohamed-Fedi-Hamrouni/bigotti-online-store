import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import type { MediaUploadInput, StoredMedia } from './media-storage.types';

@Injectable()
export class LocalMediaStorageService {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');
  private readonly publicApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.publicApiUrl = this.configService
      .get<string>('PUBLIC_API_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  async upload(input: MediaUploadInput): Promise<StoredMedia> {
    const targetDirectory = resolve(this.uploadsRoot, input.folder);
    const targetPath = resolve(targetDirectory, input.filename);

    this.assertPathInsideUploads(targetPath);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, input.buffer, { flag: 'wx' });

    return {
      url: `${this.publicApiUrl}/uploads/${input.folder}/${input.filename}`,
      storagePath: `local://uploads/${input.folder}/${input.filename}`,
      filename: input.filename,
      mediaType: input.mediaType,
    };
  }

  async delete(storagePath: string) {
    const relativePath = this.toRelativePath(storagePath);

    if (!relativePath) {
      return false;
    }

    const targetPath = resolve(process.cwd(), relativePath);
    this.assertPathInsideUploads(targetPath);

    try {
      await unlink(targetPath);
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return false;
      }

      throw error;
    }
  }

  supports(storagePath: string) {
    return (
      storagePath.startsWith('local://uploads/') ||
      storagePath.startsWith('uploads/')
    );
  }

  private toRelativePath(storagePath: string) {
    if (storagePath.startsWith('local://')) {
      return storagePath.slice('local://'.length);
    }

    if (storagePath.startsWith('uploads/')) {
      return storagePath;
    }

    return null;
  }

  private assertPathInsideUploads(targetPath: string) {
    if (
      targetPath !== this.uploadsRoot &&
      !targetPath.startsWith(`${this.uploadsRoot}${sep}`)
    ) {
      throw new Error('Chemin de stockage local non autorisé.');
    }
  }
}
