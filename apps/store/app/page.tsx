import { readFile } from "fs/promises";
import { join } from "path";
import { PhotoCarousel } from "@/components/photo-carousel";
import { StartBuilderButton } from "@/components/start-builder-button";

export const metadata = {
  title: "Bubble Drink — Bubble Tea y bebidas con boba",
};

interface SlideshowImage {
  src: string;
  alt: string;
}

interface SlideshowConfig {
  intervalMs: number;
  images: SlideshowImage[];
}

async function getSlideshow(): Promise<SlideshowConfig> {
  try {
    const raw = await readFile(
      join(process.cwd(), "public", "slideshow.json"),
      "utf-8",
    );
    return JSON.parse(raw);
  } catch {
    return { intervalMs: 4000, images: [] };
  }
}

export default async function HomePage() {
  const slideshow = await getSlideshow();

  return (
    <div className="fixed inset-0 top-14 z-30 flex flex-col overflow-hidden bg-[#fed7aa]">
      <div className="flex-1 min-h-0 px-4 pt-4">
        <PhotoCarousel
          images={slideshow.images}
          intervalMs={slideshow.intervalMs}
          className="h-full w-full object-cover rounded-2xl"
        />
      </div>
      <div className="relative w-full shrink-0 flex justify-center pb-6 pt-2">
        <StartBuilderButton />
      </div>
    </div>
  );
}
