import { createServer as createHttpsServer } from "https";
import { request as httpRequest } from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DIR = import.meta.dirname;
const ROOT = join(DIR, "..", "..");

// Host configurable: prioridad a SERVER_HOST env, si no del archivo central.
// Cambiar la IP del servidor = editar server.config.json (o exportar SERVER_HOST)
// y reiniciar el proxy. NO es necesario tocar los .env de las apps si se usa
// el script "setup-env" para regenerarlos.
function resolveHost() {
  if (process.env.SERVER_HOST) return process.env.SERVER_HOST;
  const cfgFile = join(ROOT, "server.config.json");
  if (existsSync(cfgFile)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
      if (cfg.host) return cfg.host;
    } catch (e) {
      console.error("[proxy] aviso: no se pudo leer server.config.json:", e.message);
    }
  }
  return "192.168.1.10";
}

const HOST = resolveHost();

// Certificados TLS. Si se cambia el host a un hostname (p. ej. bubba.local),
// generar unos certificados que cubran ese hostname y colocarlos en la carpeta.
function resolveTls() {
  const cert = join(DIR, `${HOST}+2.pem`);
  const key = join(DIR, `${HOST}+2-key.pem`);
  if (existsSync(cert) && existsSync(key)) {
    return { key: readFileSync(key), cert: readFileSync(cert) };
  }
  // Fallback al certificado actual de la IP para no romper nada
  return {
    key: readFileSync(join(DIR, "192.168.1.10+2-key.pem")),
    cert: readFileSync(join(DIR, "192.168.1.10+2.pem")),
  };
}

// Puerto HTTPS (tablets) -> puerto HTTP del app (dev).
// Se sobrescriben desde server.config.json si existe.
function resolvePorts() {
  const defaults = {
    store: { https: 8443, http: 3000 },
    admin: { https: 8444, http: 3001 },
    cajero: { https: 8445, http: 3002 },
    mesero: { https: 8446, http: 3003 },
  };
  const cfgFile = join(ROOT, "server.config.json");
  if (existsSync(cfgFile)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
      for (const name of Object.keys(defaults)) {
        if (cfg.http && cfg.http[name]) defaults[name].http = cfg.http[name];
        if (cfg.https && cfg.https[name]) defaults[name].https = cfg.https[name];
      }
    } catch (e) {
      console.error("[proxy] aviso: no se pudieron leer los puertos:", e.message);
    }
  }
  return defaults;
}

const HTTPS_TLS = resolveTls();
const ROUTES = resolvePorts();

function handleProxyError(err, req, res) {
  console.error("[proxy] error:", err.message);
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`Proxy error: ${err.message}`);
  } else {
    res.end();
  }
}

// Reenvía una petición HTTP al backend, reescribiendo el Host al origen
// HTTPS público (procede de req.socket.localPort) para que Next/NextAuth
// generen URLs absolutas correctas.
function buildTargetHeaders(req) {
  return {
    ...req.headers,
    host: `${HOST}:${req.socket.localPort}`,
    "x-forwarded-proto": "https",
    "x-forwarded-host": `${HOST}:${req.socket.localPort}`,
  };
}

function forward(req, res, httpPort) {
  const proxyReq = httpRequest(
    {
      host: "127.0.0.1",
      port: httpPort,
      method: req.method,
      path: req.url,
      headers: buildTargetHeaders(req),
    },
    (pres) => {
      res.writeHead(pres.statusCode, pres.headers);
      pres.pipe(res);
    },
  );
  proxyReq.on("error", (e) => handleProxyError(e, req, res));
  req.on("error", (e) => handleProxyError(e, req, res));
  req.pipe(proxyReq);
}

function forwardUpgrade(req, socket, head, httpPort) {
  const proxyReq = httpRequest({
    host: "127.0.0.1",
    port: httpPort,
    method: req.method,
    path: req.url,
    headers: buildTargetHeaders(req),
  });
  proxyReq.on("upgrade", (_pres, psocket) => {
    socket.write(
      "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n\r\n",
    );
    psocket.pipe(socket);
    socket.pipe(psocket);
  });
  proxyReq.on("error", (e) => {
    console.error("[proxy] ws error:", e.message);
    socket.end();
  });
  if (head && head.length) proxyReq.write(head);
  socket.on("error", () => {});
}

for (const [name, r] of Object.entries(ROUTES)) {
  const server = createHttpsServer(HTTPS_TLS, (req, res) => {
    forward(req, res, r.http);
  });
  server.on("upgrade", (req, socket, head) => {
    forwardUpgrade(req, socket, head, r.http);
  });
  server.listen(r.https, HOST, () => {
    console.log(`[proxy] ${name}: https://${HOST}:${r.https} -> http://127.0.0.1:${r.http}`);
  });
}

console.log("[proxy] HTTPS reverse proxy iniciado.");
