/**
 * Modern "Save As" utility using the File System Access API with a standard download fallback.
 */

export async function saveFileAs(
  content: string | Blob,
  suggestedName: string,
  contentType: string = 'application/json'
) {
  const isBlob = content instanceof Blob;
  const blob = isBlob ? content : new Blob([content], { type: contentType });

  // Try File System Access API (Modern Chrome/Edge)
  if ('showSaveFilePicker' in window) {
    try {
      const extension = suggestedName.split('.').pop() || 'json';
      const description = contentType.includes('json') ? 'JSON File' : 
                          contentType.includes('image') ? 'Image File' : 'File';

      const handle = await (window as any).showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{
          description: description,
          accept: { [contentType]: [`.${extension}`] }
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      // User cancelled the picker or error occurred
      if (err.name === 'AbortError') return false;
      console.warn('File System Access API failed, falling back to regular download', err);
    }
  }

  // Fallback to traditional <a> download
  const url = URL.createObjectURL(blob);
  const link = document.body.appendChild(document.createElement('a'));
  link.download = suggestedName;
  link.href = url;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);
  return true;
}

/**
 * Specifically for images generated via dataURL (base64)
 */
export async function saveImageAs(
  dataUrl: string,
  suggestedName: string
) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const contentType = blob.type || 'image/png';
  return saveFileAs(blob, suggestedName, contentType);
}
