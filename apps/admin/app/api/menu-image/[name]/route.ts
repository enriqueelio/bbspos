import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const MENU_IMAGES_DIR = join(
  process.cwd(),
  "..",
  "store",
  "public",
  "images",
  "menu",
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!/^[A-Za-z0-9.-]+$/.test(name)) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  try {
    const data = await readFile(join(MENU_IMAGES_DIR, name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        // El imageUrl incluye ?v=<timestamp> al subir la foto: la URL cambia
        // con cada reemplazo y el navegador puede cachear para siempre.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(data.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}