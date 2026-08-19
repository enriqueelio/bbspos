import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { readFile } from "fs/promises";

const STORE_PUBLIC = join(process.cwd(), "..", "store", "public");
const IMAGES_DIR = join(STORE_PUBLIC, "images");
const CONFIG_PATH = join(STORE_PUBLIC, "slideshow.json");

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const alt = (formData.get("alt") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `slide-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(IMAGES_DIR, filename), Buffer.from(bytes));

  const src = `/images/${filename}`;

  const configRaw = await readFile(CONFIG_PATH, "utf-8");
  const config = JSON.parse(configRaw);
  config.images.push({ src, alt });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

  return NextResponse.json({ src, alt, config });
}
