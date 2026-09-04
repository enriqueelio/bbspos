"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@bbspos/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PhotoCarouselProps {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  className?: string;
}

export function PhotoCarousel({
  images,
  intervalMs = 4000,
  className,
}: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(next, intervalMs);
    return () => clearInterval(id);
  }, [paused, next, intervalMs, images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-lg",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images.map((img, i) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            i === current ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === current
                    ? "w-6 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
