import { readFile } from "fs/promises";
import { join } from "path";
import { PhotoCarousel } from "@/components/photo-carousel";
import { StartBuilderButton } from "@/components/start-builder-button";

export const metadata = {
  title: "Bubba Drinks — Bubble Tea y bebidas con boba",
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
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-primary via-accent to-orange-300 p-10 text-center text-white shadow-lg shadow-primary/20">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Bubba Drinks
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/90">
          Arma tu bubble drink perfecta: elige el tamaño de tu vaso, tu sabor
          favorito y el tipo de boba. Hecho al momento para ti.
        </p>
        <StartBuilderButton />
      </section>

      {slideshow.images.length > 0 && (
        <PhotoCarousel
          images={slideshow.images}
          intervalMs={slideshow.intervalMs}
        />
      )}
    </div>
  );
}
