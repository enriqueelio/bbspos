// Mantiene el iconKey de los usuarios según iconos.txt §15:
//  - remapea claves del catálogo anterior (emoji) a sus equivalentes lucide;
//  - detecta usuarios activos sin iconKey y les asigna el primero libre;
//  - verifica que no existan duplicados ni claves fuera del catálogo.
//
// Si no hay suficientes iconos libres, informa y NO escribe nada.
//
// Por defecto SOLO informa (dry-run). Para escribir de verdad, pasar --apply.
//
//   corepack pnpm --filter @bbspos/db icons:assign
//   corepack pnpm --filter @bbspos/db icons:assign -- --apply
//
// Es idempotente: al terminar todo activo tiene iconKey único del catálogo
// actual, así que volver a correrlo no encuentra nada que cambiar.
import { prisma } from "../src/index";
import { ICON_CATALOG, iconEmojiOf } from "@bbspos/types";

const APPLY = process.argv.includes("--apply");

// Claves del catálogo anterior (emoji) → su equivalente en lucide-react.
const LEGACY_ICON_KEYS: Record<string, string> = {
  penguin: "bird",
  elephant: "squirrel",
};

async function main() {
  let pendiente = false;

  // Paso 0: claves legacy del catálogo anterior (iconos.txt §2: los nombres se
  // adaptan a la librería de iconos existente).
  const legacy = await prisma.user.findMany({
    where: { iconKey: { in: Object.keys(LEGACY_ICON_KEYS) } },
    select: { id: true, username: true, iconKey: true },
  });
  if (legacy.length > 0) {
    pendiente = true;
    console.log("Claves legacy a remapear:");
    for (const u of legacy) {
      const to = LEGACY_ICON_KEYS[u.iconKey ?? ""];
      console.log(`   ${u.username}: ${u.iconKey} → ${to}`);
    }
    if (APPLY) {
      for (const u of legacy) {
        await prisma.user.update({
          where: { id: u.id },
          data: { iconKey: LEGACY_ICON_KEYS[u.iconKey ?? ""] },
        });
      }
      console.log("✅ Claves legacy remapeadas.");
    }
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, username: true, name: true, iconKey: true },
    orderBy: { name: "asc" },
  });

  // Claves efectivas: en dry-run los legacy aún no se escribieron.
  const effKey = (u: (typeof users)[number]) =>
    u.iconKey ? (LEGACY_ICON_KEYS[u.iconKey] ?? u.iconKey) : null;

  // Fuera del catálogo → claves desconocidas que renderizarían el respaldo.
  const desconocidas = users.filter(
    (u) => effKey(u) && !(ICON_CATALOG as readonly string[]).includes(effKey(u)!),
  );
  if (desconocidas.length > 0) {
    console.error("❌ IconKey fuera del catálogo actual:");
    for (const u of desconocidas) {
      console.error(`   ${u.username}: ${u.iconKey}`);
    }
    process.exitCode = 1;
    return;
  }

  // Paso 4: verificar que no existan duplicados entre usuarios activos.
  const counts = new Map<string, string[]>();
  for (const u of users) {
    const key = effKey(u);
    if (!key) continue;
    counts.set(key, [...(counts.get(key) ?? []), u.username]);
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

  const sinIcono = users.filter((u) => !effKey(u));
  console.log(
    `Usuarios activos: ${users.length} · con iconKey: ${users.length - sinIcono.length} · sin iconKey: ${sinIcono.length}`
  );

  const usados = new Set(counts.keys());
  const libres = ICON_CATALOG.filter((k) => !usados.has(k));

  if (sinIcono.length > 0 && libres.length < sinIcono.length) {
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
  if (asignaciones.length > 0) pendiente = true;

  for (const { user, iconKey } of asignaciones) {
    console.log(`A asignar: ${user.username} → ${iconKey} (${iconEmojiOf(iconKey)})`);
  }

  if (!pendiente) {
    console.log("✅ Todos los usuarios activos ya tienen un iconKey único del catálogo.");
    return;
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
  const fuera = after.filter(
    (u) => u.iconKey && !(ICON_CATALOG as readonly string[]).includes(u.iconKey),
  );
  const afterCounts = new Map<string, number>();
  for (const u of after) {
    if (u.iconKey) afterCounts.set(u.iconKey, (afterCounts.get(u.iconKey) ?? 0) + 1);
  }
  const repeated = [...afterCounts.entries()].filter(([, n]) => n > 1);

  if (stillMissing.length > 0 || repeated.length > 0 || fuera.length > 0) {
    console.error("❌ Verificación final falló:", { stillMissing, repeated, fuera });
    process.exitCode = 1;
    return;
  }

  console.log(
    `✅ Listo: ${asignaciones.length} ícono(s) asignado(s); sin duplicados ni claves fuera del catálogo.`
  );
}

main()
  .catch((e) => {
    console.error("ERR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
