export type UploadedImage = {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
};

export interface ImageProvider {
  /** Uploads a single file and returns its public URL. */
  upload(file: Buffer, options: { folder: string; filename: string; contentType: string }): Promise<UploadedImage>;
  /** Deletes a previously uploaded file. Safe to call with an unknown id — should not throw. */
  delete(publicId: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class ImageValidationError extends Error {}

export function validateImageFile(file: { type: string; size: number }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError(`Unsupported file type: ${file.type}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageValidationError(`File too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`);
  }
}
