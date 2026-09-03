import https from "https";
import fs from "fs";
import { join } from "path";
import httpProxy from "http-proxy";

const { createProxyServer } = httpProxy;

const [,, sourceArg, targetArg] = process.argv;
const ROOT = import.meta.dirname ?? "C:\\Users\\PC-ENRIQUE\\Documents\\bubba";

// Si se llama sin argumentos, usar el host/puertos de server.config.json
// (p. ej. los puertos HTTPS de cada app). Con argumentos proxies un puerto manual.
function loadConfig() {
  const cfgFile = join(ROOT, "server.config.json");
  if (!fs.existsSync(cfgFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  } catch {
    return null;
  }
}

const cfg = loadConfig();
const HOST = process.env.SERVER_HOST || (cfg && cfg.host) || "192.168.1.10";
const LISTEN_HOST = "0.0.0.0";

function tlsPath(base) {
  // Busca el certificado en las ubicaciones donde puede vivir: la raíz del repo
  // y scripts/https-proxy/. Intenta con el host configurado; si no, usa el de IP.
  const bases = [
    base,
    "192.168.1.10",
  ];
  const dirs = [
    ROOT,
    join(ROOT, "scripts", "https-proxy"),
  ];
  for (const b of bases) {
    for (const d of dirs) {
      const p = join(d, `${b}+2.pem`);
      if (fs.existsSync(p)) return p;
    }
  }
  return join(ROOT, `${base}+2.pem`);
}

// Cuando se proveen source/target, proxy único manual.
if (sourceArg && targetArg) {
  const source = parseInt(sourceArg);
  const target = parseInt(targetArg);
  const cert = fs.readFileSync(tlsPath(HOST));
  const key = fs.readFileSync(tlsPath(HOST).replace(/-?\+2\.pem$/, "") + "+2-key.pem");

  const proxy = createProxyServer({ xfwd: true, changeOrigin: true });
  proxy.on("error", (err, req, res) => {
    console.error("Proxy error [" + source + "]:", err.message);
    if (res && !res.headersSent) {
      try { res.writeHead(502); } catch (_) {}
    }
    if (res && res.end) { try { res.end("Bad Gateway"); } catch (_) {} }
  });

  const server = https.createServer({ cert, key }, (req, res) => {
    proxy.web(req, res, { target: "http://localhost:" + target });
  });

  server.on("upgrade", (req, socket, head) => {
    proxy.ws(req, socket, head, { target: "http://localhost:" + target });
  });

  server.listen(source, LISTEN_HOST, () => {
    console.log(`HTTPS proxy [${source}] -> http://localhost:${target} (http-proxy)`);
  });
} else if (cfg) {
  // Modo multi-app: arranca un proxy HTTPS por app usando server.config.json
  const apps = ["store", "admin", "cajero", "mesero"];
  for (const name of apps) {
    const httpsPort = cfg.https && cfg.https[name];
    const httpPort = cfg.http && cfg.http[name];
    if (!httpsPort || !httpPort) continue;

    const cert = fs.readFileSync(tlsPath(HOST));
    const keyPath = tlsPath(HOST).replace(/-?\+2\.pem$/, "") + "+2-key.pem";
    const key = fs.readFileSync(keyPath);

    const proxy = createProxyServer({ xfwd: true, changeOrigin: true });
    proxy.on("error", (err, req, res) => {
      console.error(`Proxy error [${name}/${httpsPort}]:`, err.message);
      if (res && !res.headersSent) {
        try { res.writeHead(502); } catch (_) {}
      }
      if (res && res.end) { try { res.end("Bad Gateway"); } catch (_) {} }
    });

    const server = https.createServer({ cert, key }, (req, res) => {
      proxy.web(req, res, { target: "http://localhost:" + httpPort });
    });
    server.on("upgrade", (req, socket, head) => {
      proxy.ws(req, socket, head, { target: "http://localhost:" + httpPort });
    });
    server.listen(httpsPort, LISTEN_HOST, () => {
      console.log(`HTTPS proxy [${name}] https://${HOST}:${httpsPort} -> http://localhost:${httpPort}`);
    });
  }
} else {
  console.error("uso: node https-proxy.mjs <sourcePort> <targetPort>   (o crea server.config.json)");
  process.exit(1);
}

