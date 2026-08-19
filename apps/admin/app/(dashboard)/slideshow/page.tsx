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

interface SlideshowConfig {
  intervalMs: number;
  images: SlideImage[];
}

export default function SlideshowPage() {
  const [config, setConfig] = useState<SlideshowConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const file = e.target.files?.[0];
    if (!file || !config) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", file.name.replace(/\.[^.]+$/, ""));

    const res = await fetch("/api/slideshow/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setConfig(data.config);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Carrusel de imágenes</h1>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carrusel de imágenes</h1>
        <p className="text-muted-foreground">
          Administra las fotos del carrusel de la página de inicio.
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
        <h2 className="text-lg font-semibold">
          Imágenes ({config.images.length})
        </h2>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Subiendo..." : "Subir imagen"}
          </Button>
        </div>
      </div>

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
                  src={img.src}
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
                    disabled={i === 0}
                    onClick={() => moveImage(i, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={i === config.images.length - 1}
                    onClick={() => moveImage(i, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
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
