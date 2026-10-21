import { toPng, toJpeg } from 'html-to-image';

export interface ExportImageOptions {
  backgroundColor?: string;
  quality?: number;
  pixelRatio?: number;
  onProgress?: (status: string) => void;
  [key: string]: any;
}

export async function exportElementToDataUrl(
  element: HTMLElement,
  options: ExportImageOptions = {}
): Promise<string> {
  const pixelRatio = options.pixelRatio || (window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 2);
  const bgColor = options.backgroundColor || '#050508';

  const filter = (node: HTMLElement) => {
    if (node.classList && (node.classList.contains('no-export') || node.getAttribute('data-no-export') === 'true')) {
      return false;
    }
    if (node.tagName === 'IMG') {
      const img = node as HTMLImageElement;
      if (img.style.display === 'none' || img.hidden || !img.src) {
        return false;
      }
    }
    return true;
  };

  const config = {
    backgroundColor: bgColor,
    skipFonts: true,
    filter,
    cacheBust: false,
    quality: options.quality || 0.95,
    pixelRatio
  };

  try {
    options.onProgress?.('Рендеринг изображения...');
    return await toPng(element, config);
  } catch (err) {
    console.warn('Tier 1 PNG export failed, trying Tier 2...', err);
  }

  try {
    options.onProgress?.('Оптимизация...');
    return await toPng(element, { ...config, pixelRatio: 1.5 });
  } catch (err) {
    console.warn('Tier 2 failed, trying Tier 3 (JPEG)...', err);
  }

  try {
    options.onProgress?.('Рендеринг JPEG...');
    return await toJpeg(element, { ...config, quality: 0.9, pixelRatio: 1.2 });
  } catch (err) {
    console.error('All export tiers failed:', err);
    throw new Error('Не удалось сформировать изображение.');
  }
}

export async function downloadElementAsImage(
  element: HTMLElement,
  fileName: string,
  options: ExportImageOptions = {}
): Promise<void> {
  const dataUrl = await exportElementToDataUrl(element, options);
  const ext = dataUrl.startsWith('data:image/jpeg') ? '.jpg' : '.png';
  let cleanName = fileName.trim();
  if (!cleanName.endsWith('.png') && !cleanName.endsWith('.jpg')) {
    cleanName += ext;
  }
  const link = document.createElement('a');
  link.download = cleanName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function saveElementAsImage(
  element: HTMLElement,
  fileName: string,
  options: ExportImageOptions = {}
): Promise<void> {
  return downloadElementAsImage(element, fileName, options);
}
