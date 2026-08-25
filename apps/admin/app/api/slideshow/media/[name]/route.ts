import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const IMAGES_DIR = join(process.cwd(), "..", "store", "public", "images");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext];
  if (!contentType) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }

  try {
    const data = await readFile(join(IMAGES_DIR, name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
