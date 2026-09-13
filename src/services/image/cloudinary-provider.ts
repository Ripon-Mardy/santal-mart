import "server-only";

import { v2 as cloudinary } from "cloudinary";

import type { ImageProvider, UploadedImage } from "./types";

/**
 * Production-ready provider, activated automatically once CLOUDINARY_*
 * env vars are set — see getImageService(). Never called directly by
 * feature code; always go through the ImageService abstraction.
 */
export class CloudinaryImageProvider implements ImageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(file: Buffer, options: { folder: string; filename: string }): Promise<UploadedImage> {
    const result = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `bazarx/${options.folder}`, resource_type: "image" },
          (error, uploadResult) => {
            if (error || !uploadResult) return reject(error ?? new Error("Cloudinary upload failed"));
            resolve(uploadResult);
          }
        );
        stream.end(file);
      }
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Best-effort — don't fail the caller's flow over a cleanup error.
    }
  }
}
