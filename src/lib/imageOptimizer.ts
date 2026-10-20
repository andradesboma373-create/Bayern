/**
 * Optimizes an image client-side to a compressed WebP Data URL (base64).
 * This ensures uploaded images (avatars, team logos, tournament backgrounds)
 * persist directly in Firestore / localStorage and work everywhere (Vercel, Render, local, mobile)
 * without depending on server-side disk storage or serverless ephemeral containers.
 */
export async function optimizeImageForUpload(
  file: File,
  type: 'avatar' | 'logo' | 'background' | 'news' = 'logo'
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result as string || '');
      img.onload = () => {
        let maxW = 256;
        let maxH = 256;
        let quality = 0.85;

        if (type === 'avatar') {
          maxW = 200;
          maxH = 200;
          quality = 0.80;
        } else if (type === 'logo') {
          maxW = 256;
          maxH = 256;
          quality = 0.85;
        } else if (type === 'news') {
          maxW = 800;
          maxH = 450;
          quality = 0.78;
        } else if (type === 'background') {
          maxW = 1280;
          maxH = 720;
          quality = 0.75;
        }

        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(reader.result as string || '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export to WebP first, fall back to JPEG or PNG
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch (e) {}

        try {
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        } catch (e) {
          resolve(reader.result as string || '');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
