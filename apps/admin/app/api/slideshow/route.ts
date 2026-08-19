import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const STORE_PUBLIC = join(process.cwd(), "..", "store", "public");
const CONFIG_PATH = join(STORE_PUBLIC, "slideshow.json");

async function readConfig() {
  const raw = await readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeConfig(config: unknown) {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const config = await readConfig();

  if (body.intervalMs !== undefined) {
    config.intervalMs = Number(body.intervalMs);
  }

  if (body.images !== undefined) {
    config.images = body.images;
  }

  await writeConfig(config);
  return NextResponse.json(config);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "src required" }, { status: 400 });
  }

  const config = await readConfig();
  config.images = config.images.filter((img: { src: string }) => img.src !== src);
  await writeConfig(config);

  return NextResponse.json(config);
}
