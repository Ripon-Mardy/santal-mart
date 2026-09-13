"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Star, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type ImageEntry = { url: string; altText?: string; isPrimary: boolean };
export type UploadImageResult = { success: true; url: string } | { success: false; message: string };

/**
 * Generic image uploader shared by seller product/store forms and admin
 * category/brand/banner forms. Each caller passes its own server action so
 * uploads land in the right authorized folder (`uploadProductImage`,
 * `uploadAdminImage`, etc.) while sharing one UI.
 */
export function ImageUploader({
  images,
  onChange,
  uploadAction,
  multiple = true,
}: {
  images: ImageEntry[];
  onChange: (images: ImageEntry[]) => void;
  uploadAction: (formData: FormData) => Promise<UploadImageResult>;
  multiple?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const uploaded: ImageEntry[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadAction(fd);
      if (result.success) uploaded.push({ url: result.url, isPrimary: false });
      else toast.error(result.message);
    }
    setIsUploading(false);
    if (uploaded.length > 0) {
      const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
      if (!next.some((i) => i.isPrimary)) next[0].isPrimary = true;
      onChange(next);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.url} className={cn("group relative aspect-square overflow-hidden rounded-lg border-2", img.isPrimary ? "border-primary" : "border-transparent")}>
            <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" sizes="150px" />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {multiple && (
                <Button
                  type="button" size="icon" variant="secondary" className="size-7"
                  onClick={() => onChange(images.map((im, idx) => ({ ...im, isPrimary: idx === i })))}
                  aria-label="Set as primary"
                >
                  <Star className={cn("size-3.5", img.isPrimary && "fill-current")} />
                </Button>
              )}
              <Button
                type="button" size="icon" variant="destructive" className="size-7"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                aria-label="Remove image"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {multiple && img.isPrimary && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">Primary</span>}
          </div>
        ))}
        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
          >
            {isUploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            <span className="text-xs">Upload</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
