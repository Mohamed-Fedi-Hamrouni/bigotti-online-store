export type MediaFolder = 'products' | 'campaigns';

export type MediaKind = 'IMAGE' | 'VIDEO';

export type DetectedMedia = {
  mimeType: string;
  extension: 'jpg' | 'png' | 'webp' | 'mp4' | 'webm';
  kind: MediaKind;
};

export type StoredMedia = {
  url: string;
  storagePath: string;
  filename: string;
  mediaType: MediaKind;
};

export type MediaUploadInput = {
  folder: MediaFolder;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  mediaType: MediaKind;
};
