export function formatImageSrc(image: any): string | null {
  if (!image) {
    return null;
  }

  if (typeof image === 'object' && !Array.isArray(image) && !(image instanceof Uint8Array) && Array.isArray(image.data)) {
    image = image.data;
  }

  if (Array.isArray(image) || image instanceof Uint8Array) {
    if (image.length === 0) {
      return null;
    }
    const bytes = image instanceof Uint8Array ? image : new Uint8Array(image);
    const len = bytes.byteLength;
    if (len === 0) return null;

    let mimeType = 'image/jpeg';
    if (len >= 2) {
      if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        mimeType = 'image/png';
      } else if (bytes[0] === 0x47 && bytes[1] === 0x49) {
        mimeType = 'image/gif';
      } else if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        mimeType = 'image/bmp';
      }
    }

    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < len; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return `data:${mimeType};base64,` + window.btoa(binary);
  }

  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed === '') {
      return null;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('data:image')) {
      return trimmed;
    }
    if (trimmed.startsWith('iVBORw0KGgo')) {
      return 'data:image/png;base64,' + trimmed;
    }
    return 'data:image/jpeg;base64,' + trimmed;
  }

  return null;
}
