import "server-only";

import type { ImageProvider } from "./types";
import { LocalDiskImageProvider } from "./local-provider";
import { CloudinaryImageProvider } from "./cloudinary-provider";

export { validateImageFile, ImageValidationError, MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "./types";
export type { UploadedImage, ImageProvider } from "./types";

let cached: ImageProvider | undefined;

/**
 * Returns the active ImageService provider. Cloudinary is used automatically
 * once all three CLOUDINARY_* env vars are set; otherwise files are written
 * to /public/uploads for local development and demos.
 */
export function getImageService(): ImageProvider {
  if (cached) return cached;

  const hasCloudinary =
    !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;

  cached = hasCloudinary ? new CloudinaryImageProvider() : new LocalDiskImageProvider();

  return cached;
}
