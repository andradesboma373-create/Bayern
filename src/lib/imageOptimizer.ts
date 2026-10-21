import { compressImage } from './utils';

export async function optimizeImageForUpload(
  fileOrSrc: File | Blob | string,
  type: 'logo' | 'avatar' | 'bg' | 'banner' | string = 'logo'
): Promise<string> {
  let maxWidth = 400;
  let maxHeight = 400;
  let quality = 0.85;

  if (type === 'bg' || type === 'banner') {
    maxWidth = 1920;
    maxHeight = 1080;
    quality = 0.8;
  } else if (type === 'avatar') {
    maxWidth = 256;
    maxHeight = 256;
    quality = 0.85;
  } else if (type === 'logo') {
    maxWidth = 256;
    maxHeight = 256;
    quality = 0.9;
  }

  return compressImage(fileOrSrc as any, maxWidth, maxHeight, quality);
}
