import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  type ContainerClient,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaUploadInput, StoredMedia } from './media-storage.types';

@Injectable()
export class AzureBlobStorageService {
  private containerClientPromise: Promise<ContainerClient> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async upload(input: MediaUploadInput): Promise<StoredMedia> {
    const containerClient = await this.getContainerClient();
    const blobName = `${input.folder}/${input.filename}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(input.buffer, {
      blobHTTPHeaders: {
        blobContentType: input.mimeType,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
      metadata: {
        application: 'bigotti-online-store',
        mediaType: input.mediaType.toLowerCase(),
      },
    });

    return {
      url: this.buildPublicUrl(blockBlobClient.url, blobName),
      storagePath: `azure://${containerClient.containerName}/${blobName}`,
      filename: input.filename,
      mediaType: input.mediaType,
    };
  }

  async delete(storagePath: string) {
    const parsedPath = this.parseStoragePath(storagePath);

    if (!parsedPath) {
      return false;
    }

    const containerClient = await this.getContainerClient();

    if (parsedPath.containerName !== containerClient.containerName) {
      return false;
    }

    const result = await containerClient
      .getBlockBlobClient(parsedPath.blobName)
      .deleteIfExists({
        deleteSnapshots: 'include',
      });

    return result.succeeded;
  }

  supports(storagePath: string) {
    return storagePath.startsWith('azure://');
  }

  private async getContainerClient() {
    if (!this.containerClientPromise) {
      this.containerClientPromise = this.createContainerClient();
    }

    return this.containerClientPromise;
  }

  private async createContainerClient() {
    const containerName = this.configService.getOrThrow<string>(
      'AZURE_STORAGE_CONTAINER_NAME',
    );

    const connectionString = this.configService
      .get<string>('AZURE_STORAGE_CONNECTION_STRING')
      ?.trim();

    let blobServiceClient: BlobServiceClient;

    if (connectionString) {
      blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
    } else {
      const accountName = this.configService.getOrThrow<string>(
        'AZURE_STORAGE_ACCOUNT_NAME',
      );

      const managedIdentityClientId = this.configService
        .get<string>('AZURE_CLIENT_ID')
        ?.trim();

      const credential = new DefaultAzureCredential(
        managedIdentityClientId
          ? {
              managedIdentityClientId,
            }
          : undefined,
      );

      blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential,
      );
    }

    const containerClient =
      blobServiceClient.getContainerClient(containerName);

    const autoCreate = this.configService.get<boolean>(
      'AZURE_STORAGE_AUTO_CREATE_CONTAINER',
      false,
    );

    if (autoCreate) {
      const allowPublicAccess = this.configService.get<boolean>(
        'AZURE_STORAGE_CONTAINER_PUBLIC',
        false,
      );

      await containerClient.createIfNotExists({
        access: allowPublicAccess ? 'blob' : undefined,
      });
    }

    return containerClient;
  }

  private buildPublicUrl(blockBlobUrl: string, blobName: string) {
    const configuredBaseUrl = this.configService
      .get<string>('AZURE_STORAGE_PUBLIC_BASE_URL')
      ?.trim()
      .replace(/\/$/, '');

    if (!configuredBaseUrl) {
      return blockBlobUrl;
    }

    const encodedBlobName = blobName
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `${configuredBaseUrl}/${encodedBlobName}`;
  }

  private parseStoragePath(storagePath: string) {
    if (!storagePath.startsWith('azure://')) {
      return null;
    }

    const value = storagePath.slice('azure://'.length);
    const separatorIndex = value.indexOf('/');

    if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
      return null;
    }

    return {
      containerName: value.slice(0, separatorIndex),
      blobName: value.slice(separatorIndex + 1),
    };
  }
}
