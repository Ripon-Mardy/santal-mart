import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ImageProvider, UploadedImage } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/**
 * Dev/demo default: writes files straight to /public/uploads so they're
 * served by Next.js like any other static asset. Swap for
 * CloudinaryImageProvider (or S3, etc.) in production by setting the
 * CLOUDINARY_* env vars — see getImageService().
 */
export class LocalDiskImageProvider implements ImageProvider {
  async upload(file: Buffer, options: { folder: string; filename: string }): Promise<UploadedImage> {
    const safeFolder = options.folder.replace(/[^a-z0-9/_-]/gi, "");
    const dir = path.join(UPLOAD_ROOT, safeFolder);
    await mkdir(dir, { recursive: true });

    const ext = path.extname(options.filename) || ".jpg";
    const publicId = `${safeFolder}/${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_ROOT, publicId);

    await writeFile(filePath, file);

    return { url: `/uploads/${publicId}`, publicId };
  }

  async delete(publicId: string): Promise<void> {
    try {
      await unlink(path.join(UPLOAD_ROOT, publicId));
    } catch {
      // Already gone / never existed — deleting is best-effort.
    }
  }
}
