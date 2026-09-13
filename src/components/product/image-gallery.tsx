"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "cn";

export function ImageGallery({ images, productName }: { images: { url: string; altText?: string | null }[]; productName: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        {current ? (
          <Image src={current.url} alt={current.altText ?? productName} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image available</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border-2 bg-muted",
                i === active ? "border-primary" : "border-transparent"
              )}
            >
              <Image src={img.url} alt={img.altText ?? productName} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
