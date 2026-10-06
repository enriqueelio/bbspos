import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function assignIcons() {
  console.log("🔄 Iniciando asignación de íconos a usuarios existentes...\n");

  // 1. Obtener todos los usuarios activos
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, username: true, name: true, iconKey: true },
  });

  console.log(`📊 Total usuarios activos: ${users.length}`);

  // 2. Obtener cuáles ya tienen ícono
  const withIcon = users.filter((u) => u.iconKey);
  const withoutIcon = users.filter((u) => !u.iconKey);

  console.log(`   Con ícono asignado: ${withIcon.length}`);
  console.log(`   Sin ícono asignado: ${withoutIcon.length}\n`);

  // 3. Obtener catálogo de íconos disponibles
  // Los definimos aquí igual que en types/src/user-icons.ts
  const ICON_CATALOG = [
    "cat",
    "dog",
    "fox",
    "panda",
    "lion",
    "tiger",
    "bear",
    "rabbit",
    "penguin",
    "koala",
    "monkey",
    "owl",
    "turtle",
    "elephant",
    "whale",
    "dolphin",
    "shark",
    "butterfly",
    "bee",
    "fish",
  ];

  // 4. Contar cuántos usuarios tienen cada ícono
  const iconCounts: Record<string, number> = {};
  for (const key of ICON_CATALOG) {
    iconCounts[key] = 0;
  }

  for (const user of users) {
    if (user.iconKey && iconCounts[user.iconKey] !== undefined) {
      iconCounts[user.iconKey]++;
    }
  }

  // 5. Encontrar íconos libres (usados por 0 usuarios activos)
  const freeIcons = ICON_CATALOG.filter(
    (key) => iconCounts[key] === 0,
  );

  console.log(`📦 Íconos en catálogo: ${ICON_CATALOG.length}`);
  console.log(`🆓 Íconos totalmente libres: ${freeIcons.length}\n`);

  // Mostrar distribución
  console.log("📊 Distribución actual de íconos:");
  for (const [key, count] of Object.entries(iconCounts)) {
    const label = key === "cat" ? "Gato" : key === "dog" ? "Perro" : key;
    console.log(`   ${label}: ${count} usuarios`);
  }
  console.log("");

  // 6. Asignar íconos libres a usuarios sin ícono
  let assigned = 0;
  for (const user of withoutIcon) {
    // Buscar un ícono libre
    const free = freeIcons.find((key) => iconCounts[key] === 0);
    if (free) {
      await prisma.user.update({
        where: { id: user.id },
        data: { iconKey: free },
      });
      iconCounts[free] = 1; // Ya no está libre
      assigned++;
      console.log(`   ✅ ${user.username} → ${free} (${ICON_CATALOG.find((k) => k === free)})`);
    } else {
      console.log(`   ⚠️ ${user.username}: no hay íconos libres disponibles`);
    }
  }

  console.log(`\n✅ Total asignados: ${assigned} de ${withoutIcon.length} usuarios sin ícono`);

  // 7. Verificar que no queden duplicados
  const finalCheck = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, username: true, iconKey: true },
  });

  const duplicates = finalCheck.filter(
    (u, idx, arr) => arr.findIndex((x) => x.iconKey === u.iconKey && x.id !== u.id),
  );

  if (duplicates.length > 0) {
    console.log(`❌ ERROR: Se detectaron ${duplicates.length} duplicados de ícono!`);
    duplicates.forEach((d) => {
      console.log(`   ${d.username}: ${d.iconKey}`);
    });
  } else {
    console.log("✅ Verificación final: No hay duplicados de ícono");
  }

  await prisma.$disconnect();
}

// Ejecutar
assignIcons()
  .then(() => console.log("\n🎉 Proceso completado"))
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  });