"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, CardContent, Input, Label } from "@bubba/ui";
import { cn } from "@bubba/ui";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Upload,
  ImageIcon,
} from "lucide-react";

interface SlideImage {
  src: string;
  alt: string;
}

function mediaUrl(src: string) {
  if (src.startsWith("/images/")) {
    return `/api/slideshow/media/${src.slice("/images/".length)}`;
  }
  return src;
}

interface SlideshowConfig {
  intervalMs: number;
  images: SlideImage[];
}

/**
 * Reduce la imagen en el navegador antes de subirla: máximo 1600px de ancho
 * y re-codificación a JPEG (calidad 0.82) para que el carrusel cargue rápido.
 * Si no se puede procesar, devuelve el archivo original.
 */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_WIDTH = 1600;
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    if (scale === 1 && file.type === "image/jpeg" && file.size < 400 * 1024) {
      bitmap.close();
      return file;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // Fondo blanco: evita que PNGs con transparencia salgan negros en JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function SlideshowPage() {
  const [config, setConfig] = useState<SlideshowConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/slideshow")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  async function save(newConfig: SlideshowConfig) {
    setSaving(true);
    await fetch("/api/slideshow", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
    setConfig(newConfig);
    setSaving(false);
  }

  function updateInterval(ms: number) {
    if (!config) return;
    save({ ...config, intervalMs: ms });
  }

  function updateAlt(index: number, alt: string) {
    if (!config) return;
    const images = [...config.images];
    images[index] = { ...images[index], alt };
    save({ ...config, images });
  }

  function moveImage(index: number, dir: -1 | 1) {
    if (!config) return;
    const images = [...config.images];
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    save({ ...config, images });
  }

  async function removeImage(index: number) {
    if (!config) return;
    const img = config.images[index];
    await fetch(`/api/slideshow?src=${encodeURIComponent(img.src)}`, {
      method: "DELETE",
    });
    const images = config.images.filter((_, i) => i !== index);
    save({ ...config, images });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !config) return;

    setUploading(true);
    try {
      // Secuencial para conservar el orden de selección en el carrusel.
      for (let i = 0; i < files.length; i++) {
        setProgress({ done: i + 1, total: files.length });

        const file = await compressImage(files[i]);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("alt", file.name.replace(/\.[^.]+$/, ""));

        const res = await fetch("/api/slideshow/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (data.config) setConfig(data.config);
      }
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">Carrusel de imágenes</h1>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Carrusel de imágenes</h1>
        <p className="text-muted-foreground">
          Administra las fotos del carrusel de la página de inicio. Puedes
          seleccionar varias a la vez; se optimizan automáticamente para carga
          rápida.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Tiempo entre fotos
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1000}
                step={500}
                value={config.intervalMs}
                onChange={(e) => updateInterval(Number(e.target.value))}
                className="w-28 text-right"
              />
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            1000ms = 1 segundo. Recomendado: 3000-5000ms.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Imágenes ({config.images.length})
        </h2>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Subiendo..." : "Subir imágenes"}
          </Button>
        </div>
      </div>

      {uploading && progress && (
        <div className="text-center">
          <div className="text-xl font-bold text-primary animate-pulse">
            Subiendo imagen {progress.done} de {progress.total}...
          </div>
        </div>
      )}

      {config.images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <p>No hay imágenes. Sube una para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {config.images.map((img, i) => (
            <Card key={img.src}>
              <CardContent className="flex items-center gap-4 p-4">
                <img
                  src={mediaUrl(img.src)}
                  alt={img.alt}
                  className="h-20 w-32 rounded-lg object-cover"
                />
                <div className="flex-1 space-y-1">
                  <Input
                    value={img.alt}
                    onChange={(e) => updateAlt(i, e.target.value)}
                    placeholder="Descripción de la imagen"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {img.src}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={uploading || i === 0}
                    onClick={() => moveImage(i, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={uploading || i === config.images.length - 1}
                    onClick={() => moveImage(i, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={uploading}
                    onClick={() => removeImage(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {saving && (
        <p className="text-center text-sm text-muted-foreground">Guardando...</p>
      )}
    </div>
  );
}
