import { prisma } from "@bbspos/db";
import { NextResponse } from "next/server";

/** Salsas disponibles para las Alitas Mixtas (catálogo en BD, no hardcodeadas). */
export async function GET() {
  const sauces = await prisma.alitaSauce.findMany({
    where: { available: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sauces);
}