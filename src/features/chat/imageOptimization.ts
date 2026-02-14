const MAX_IMAGE_DIMENSION = 1600;
const TARGET_IMAGE_BYTES = 900 * 1024;
const START_QUALITY = 0.84;
const MIN_QUALITY = 0.56;
const QUALITY_STEP = 0.08;
const RESIZE_STEP = 0.86;
const MAX_RESIZE_ATTEMPTS = 4;

function replaceFileExtension(fileName: string, extension: string) {
  const trimmedName = fileName.trim();
  const dotIndex = trimmedName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return `${trimmedName || "image"}.${extension}`;
  }

  return `${trimmedName.slice(0, dotIndex)}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Rasmni blob formatga o'tkazib bo'lmadi."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
      nextImage.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getScaledDimensions(width: number, height: number) {
  const maxSide = Math.max(width, height);
  if (maxSide <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function optimizeImageForUpload(file: File) {
  if (file.type === "image/gif") {
    return file;
  }

  const image = await loadImage(file);
  const initialDimensions = getScaledDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  let targetWidth = initialDimensions.width;
  let targetHeight = initialDimensions.height;
  let bestBlob: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < MAX_RESIZE_ATTEMPTS; resizeAttempt += 1) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (
      let quality = START_QUALITY;
      quality >= MIN_QUALITY;
      quality -= QUALITY_STEP
    ) {
      const blob = await canvasToBlob(canvas, "image/webp", quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= TARGET_IMAGE_BYTES) {
        return new File([blob], replaceFileExtension(file.name, "webp"), {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }
    }

    const nextWidth = Math.max(360, Math.round(targetWidth * RESIZE_STEP));
    const nextHeight = Math.max(360, Math.round(targetHeight * RESIZE_STEP));

    if (nextWidth === targetWidth && nextHeight === targetHeight) {
      break;
    }

    targetWidth = nextWidth;
    targetHeight = nextHeight;
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  return new File([bestBlob], replaceFileExtension(file.name, "webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
