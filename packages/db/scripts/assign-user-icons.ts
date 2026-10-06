// Asigna iconKey a los usuarios ACTIVOS que no tengan uno (iconos.txt §15).
//
// Qué hace:
// 1. detecta usuarios activos sin iconKey;
// 2. calcula los iconos libres del catálogo (los que no usa ningún activo);
// 3. los asigna en orden de catálogo;
// 4. verifica que no existan duplicados entre activos.
//
// Si no hay suficientes iconos libres, informa y NO escribe nada.
//
// Por defecto SOLO informa (dry-run). Para escribir de verdad, pasar --apply.
//
//   corepack pnpm --filter @bbspos/db icons:assign
//   corepack pnpm --filter @bbspos/db icons:assign -- --apply
//
// Es idempotente: al terminar todo activo tiene iconKey único, así que volver
// a correrlo no encuentra nada que asignar.
import { prisma } from "../src/index";
import { ICON_CATALOG, iconEmojiOf } from "@bbspos/types";

const APPLY = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, username: true, name: true, iconKey: true },
    orderBy: { name: "asc" },
  });

  // Paso 4: verificar que no existan duplicados entre usuarios activos.
  const counts = new Map<string, string[]>();
  for (const u of users) {
    if (!u.iconKey) continue;
    counts.set(u.iconKey, [...(counts.get(u.iconKey) ?? []), u.username]);
  }
  const duplicados = [...counts.entries()].filter(([, owners]) => owners.length > 1);
  if (duplicados.length > 0) {
    console.error("❌ IconKey duplicados entre usuarios activos:");
    for (const [key, owners] of duplicados) {
      console.error(`   ${key}: ${owners.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  const sinIcono = users.filter((u) => !u.iconKey);
  console.log(
    `Usuarios activos: ${users.length} · con iconKey: ${users.length - sinIcono.length} · sin iconKey: ${sinIcono.length}`
  );

  if (sinIcono.length === 0) {
    console.log("✅ Todos los usuarios activos ya tienen un iconKey único.");
    return;
  }

  const usados = new Set(counts.keys());
  const libres = ICON_CATALOG.filter((k) => !usados.has(k));

  if (libres.length < sinIcono.length) {
    console.error(
      `❌ Íconos libres: ${libres.length} — insuficientes para ${sinIcono.length} usuarios. No se asigna nada.`
    );
    process.exitCode = 1;
    return;
  }

  const asignaciones = sinIcono.map((u, i) => ({
    user: u,
    iconKey: libres[i],
  }));

  console.log("Íconos a asignar:");
  for (const { user, iconKey } of asignaciones) {
    console.log(`   ${user.username} → ${iconKey} (${iconEmojiOf(iconKey)})`);
  }

  if (!APPLY) {
    console.log("\nDry-run: pasar --apply para escribir los cambios.");
    return;
  }

  for (const { user, iconKey } of asignaciones) {
    await prisma.user.update({
      where: { id: user.id },
      data: { iconKey },
    });
  }

  const after = await prisma.user.findMany({
    where: { active: true },
    select: { username: true, iconKey: true },
  });
  const stillMissing = after.filter((u) => !u.iconKey);
  const afterCounts = new Map<string, number>();
  for (const u of after) {
    if (u.iconKey) afterCounts.set(u.iconKey, (afterCounts.get(u.iconKey) ?? 0) + 1);
  }
  const repeated = [...afterCounts.entries()].filter(([, n]) => n > 1);

  if (stillMissing.length > 0 || repeated.length > 0) {
    console.error("❌ Verificación final falló:", { stillMissing, repeated });
    process.exitCode = 1;
    return;
  }

  console.log(`✅ ${asignaciones.length} ícono(s) asignado(s); sin duplicados.`);
}

main()
  .catch((e) => {
    console.error("ERR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
