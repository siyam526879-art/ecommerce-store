"use client";

import { useState } from "react";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: Array<{ url: string; alt?: string | null }>;
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  if (!current) {
    return (
      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg border bg-muted overflow-hidden">
        <AspectRatio ratio={1}>
          <Image
            src={current.url}
            alt={current.alt ?? "Product image"}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </AspectRatio>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "relative aspect-square rounded-md border-2 overflow-hidden bg-muted",
                selected === i ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
              )}
            >
              <Image src={img.url} alt={img.alt ?? ""} fill sizes="100px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}