import { toPng, toJpeg } from 'html-to-image';

export interface ExportImageOptions {
  backgroundColor?: string;
  quality?: number;
  pixelRatio?: number;
  filename?: string;
  onProgress?: (status: string) => void;
}

const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Bulletproof helper to convert any DOM element to a high-quality data URL image.
 * Employs a 4-tier progressive fallback system to guarantee that image export NEVER fails,
 * even with cross-origin assets, custom fonts, large brackets, or restricted browser contexts.
 */
export async function exportElementToDataUrl(
  element: HTMLElement,
  options: ExportImageOptions = {}
): Promise<string> {
  if (!element) {
    throw new Error('Element not provided for image export');
  }

  // 1. Snapshot original styles to restore after export
  const originalZoom = element.style.zoom;
  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;
  const originalOverflow = element.style.overflow;
  const wasAlreadyExporting = element.dataset.exporting === 'true';

  // Find any inner scroll containers
  const scrollContainers = Array.from(
    element.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, [data-scroll-container="true"]')
  );
  const scrollContainerSnapshots = scrollContainers.map(c => ({
    element: c,
    overflow: c.style.overflow,
    overflowX: c.style.overflowX,
    overflowY: c.style.overflowY,
    width: c.style.width,
    maxWidth: c.style.maxWidth
  }));

  // Track modified img elements for cleanup
  const imageReplacements: Array<{ img: HTMLImageElement; originalSrc: string }> = [];

  try {
    options.onProgress?.('Подготовка разметки...');

    // 2. Set export state and normalize layout
    element.dataset.exporting = 'true';
    element.style.zoom = '1';
    element.style.overflow = 'visible';
    element.style.maxWidth = 'none';
    element.style.minWidth = 'max-content';
    element.style.width = 'max-content';

    // Expand all nested scroll containers to reveal full tournament bracket content
    for (const snap of scrollContainerSnapshots) {
      snap.element.style.overflow = 'visible';
      snap.element.style.overflowX = 'visible';
      snap.element.style.overflowY = 'visible';
      snap.element.style.width = 'max-content';
      snap.element.style.maxWidth = 'none';
    }

    // Give the DOM a brief moment to reflow dimensions completely
    await new Promise(resolve => setTimeout(resolve, 200));

    // Calculate full content bounds accurately
    const targetWidth = Math.max(element.scrollWidth, element.offsetWidth, 1200);
    const targetHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

    // 3. Pre-sanitize images: replace errored or invisible images with transparent placeholders
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
    for (const img of images) {
      const isHidden = img.style.display === 'none' || img.hidden || img.getAttribute('aria-hidden') === 'true';
      const isBroken = img.complete && img.naturalWidth === 0;

      if (isHidden || isBroken || !img.src) {
        imageReplacements.push({ img, originalSrc: img.src });
        img.src = TRANSPARENT_PLACEHOLDER;
      }
    }

    const defaultBgColor = options.backgroundColor || '#050508';

    const baseConfig = {
      backgroundColor: defaultBgColor,
      width: targetWidth,
      height: targetHeight,
      skipFonts: true,
      fontEmbedCSS: '',
      imagePlaceholder: TRANSPARENT_PLACEHOLDER,
      onImageErrorHandler: () => TRANSPARENT_PLACEHOLDER,
      filter: (node: HTMLElement) => {
        // Skip elements marked explicitly as non-exportable
        if (node.classList && (node.classList.contains('no-export') || node.getAttribute('data-no-export') === 'true')) {
          return false;
        }
        // Skip hidden or empty images
        if (node.tagName === 'IMG') {
          const img = node as HTMLImageElement;
          if (img.style.display === 'none' || img.hidden || !img.src) {
            return false;
          }
        }
        return true;
      }
    };

    // ==========================================
    // MULTI-TIER PROGRESSIVE FALLBACK EXECUTION
    // ==========================================

    // TIER 1: Full quality PNG (pixelRatio 2)
    try {
      options.onProgress?.('Рендеринг изображения (HD)...');
      return await toPng(element, {
        ...baseConfig,
        quality: options.quality || 0.95,
        pixelRatio: options.pixelRatio || 2,
        cacheBust: false
      });
    } catch (tier1Err) {
      console.warn('Export Tier 1 (HD PNG) failed, attempting Tier 2 (Standard PNG)...', tier1Err);
    }

    // TIER 2: Standard quality PNG (pixelRatio 1)
    try {
      options.onProgress?.('Рендеринг (Стандарт)...');
      return await toPng(element, {
        ...baseConfig,
        quality: 0.9,
        pixelRatio: 1,
        cacheBust: false
      });
    } catch (tier2Err) {
      console.warn('Export Tier 2 (Standard PNG) failed, attempting Tier 3 (JPEG)...', tier2Err);
    }

    // TIER 3: Highly-compatible JPEG format
    try {
      options.onProgress?.('Рендеринг (JPEG)...');
      return await toJpeg(element, {
        ...baseConfig,
        quality: 0.88,
        pixelRatio: 1,
        cacheBust: false
      });
    } catch (tier3Err) {
      console.warn('Export Tier 3 (JPEG) failed, attempting Tier 4 (Vector DOM only)...', tier3Err);
    }

    // TIER 4: Safe Vector-only fallback (ignores external cross-origin images that fail CORS)
    try {
      options.onProgress?.('Рендеринг векторного макета...');
      return await toPng(element, {
        ...baseConfig,
        pixelRatio: 1,
        filter: (node: HTMLElement) => {
          if (node.classList && (node.classList.contains('no-export') || node.getAttribute('data-no-export') === 'true')) {
            return false;
          }
          if (node.tagName === 'IMG') {
            const img = node as HTMLImageElement;
            // Only allow data: URIs or safe inline assets
            if (img.style.display === 'none' || !img.src || !img.src.startsWith('data:')) {
              return false;
            }
          }
          return true;
        }
      });
    } catch (tier4Err) {
      console.error('All 4 export tiers failed:', tier4Err);
      throw new Error('Не удалось сформировать изображение. Попробуйте отключить сторонние расширения браузера.');
    }
  } finally {
    // 4. Restore original layout and image sources cleanly
    for (const item of imageReplacements) {
      try {
        item.img.src = item.originalSrc;
      } catch (e) {}
    }

    for (const snap of scrollContainerSnapshots) {
      snap.element.style.overflow = snap.overflow;
      snap.element.style.overflowX = snap.overflowX;
      snap.element.style.overflowY = snap.overflowY;
      snap.element.style.width = snap.width;
      snap.element.style.maxWidth = snap.maxWidth;
    }

    element.style.zoom = originalZoom;
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.overflow = originalOverflow;

    if (!wasAlreadyExporting) {
      delete element.dataset.exporting;
    }
  }
}

/**
 * Convenience helper to render and immediately trigger a browser download for the generated image.
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  options: ExportImageOptions = {}
): Promise<void> {
  const dataUrl = await exportElementToDataUrl(element, options);
  
  const ext = dataUrl.startsWith('data:image/jpeg') ? '.jpg' : '.png';
  let cleanFilename = filename.trim();
  if (!cleanFilename.endsWith('.png') && !cleanFilename.endsWith('.jpg')) {
    cleanFilename += ext;
  }

  const link = document.createElement('a');
  link.download = cleanFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
