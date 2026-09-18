/**
 * Compresses an image File or Blob to WebP format using HTML5 Canvas.
 * Handles resizing to maxWidth/maxHeight and quality reduction.
 *
 * @param {File|Blob} file
 * @param {Object} options
 * @param {number} [options.maxWidth=1920]
 * @param {number} [options.maxHeight=1920]
 * @param {number} [options.quality=0.82]
 * @returns {Promise<File>} Compressed File in WebP format
 */
export async function compressToWebP(file, { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // If already a small SVG or animated gif where user might want to preserve frames, skip canvas if needed
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file); // Fallback to original on error
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const baseName = (file.name || 'image').replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
