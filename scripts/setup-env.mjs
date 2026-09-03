// setup-env.mjs
//
// Regenera los NEXTAUTH_URL de las apps (admin, cajero, mesero) según el host
// definido en server.config.json. Así, cambiar la IP del servidor es editar UN
// solo archivo (server.config.json) y correr:  pnpm setup-env
//
// Uso:
//   pnpm setup-env            -> lee server.config.json y actualiza NEXTAUTH_URL
//   pnpm -- setup-env --host 192.168.1.25  -> fuerza un host y lo guarda
//
// Después de correrlo hay que reiniciar las apps de Next para que tomen el nuevo .env.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CFG_FILE = join(ROOT, "server.config.json");

function loadConfig() {
  const fallback = { host: "192.168.1.10", https: {} };
  if (!existsSync(CFG_FILE)) return fallback;
  try {
    return JSON.parse(readFileSync(CFG_FILE, "utf8"));
  } catch (e) {
    console.error("[setup-env] aviso: no se pudo leer server.config.json:", e.message);
    return fallback;
  }
}

function rewriteEnv(appDir, host, httpsPort) {
  const envFile = join(ROOT, "apps", appDir, ".env");
  const example = join(ROOT, "apps", appDir, ".env.example");
  if (!existsSync(envFile)) {
    console.warn(`[setup-env] no existe apps/${appDir}/.env — omitido`);
    return;
  }
  const url = `https://${host}:${httpsPort}`;
  let content = readFileSync(envFile, "utf8");

  if (/^NEXTAUTH_URL=/m.test(content)) {
    content = content.replace(/^NEXTAUTH_URL=.*$/m, `NEXTAUTH_URL="${url}"`);
  } else {
    content = `NEXTAUTH_URL="${url}"\n` + content;
  }
  writeFileSync(envFile, content, "utf8");
  console.log(`[setup-env] apps/${appDir}/.env -> NEXTAUTH_URL="${url}"`);
}

// --host fuerza/actualiza el host en server.config.json
const hostArgIndex = process.argv.indexOf("--host");
if (hostArgIndex !== -1) {
  const forced = process.argv[hostArgIndex + 1];
  if (!forced) {
    console.error("[setup-env] falta el valor de --host. Ej: pnpm -- setup-env --host 192.168.1.25");
    process.exit(1);
  }
  const cfg0 = loadConfig();
  cfg0.host = forced;
  writeFileSync(CFG_FILE, JSON.stringify(cfg0, null, 2) + "\n", "utf8");
  console.log(`[setup-env] server.config.json -> host="${forced}"`);
}

const cfg = loadConfig();
const host = cfg.host || "192.168.1.10";

rewriteEnv("admin", host, (cfg.https && cfg.https.admin) || 8444);
rewriteEnv("cajero", host, (cfg.https && cfg.https.cajero) || 8445);
rewriteEnv("mesero", host, (cfg.https && cfg.https.mesero) || 8446);

console.log("[setup-env] Listo. Reinicia las apps de Next (pnpm dev) para aplicar el cambio.");
