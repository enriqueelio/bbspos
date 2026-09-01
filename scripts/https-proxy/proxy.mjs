import { createServer as createHttpsServer } from "https";
import { request as httpRequest } from "http";
import { readFileSync } from "fs";
import { join } from "path";

const DIR = import.meta.dirname;
const HOST = "192.168.1.10";

const HTTPS_TLS = {
  key: readFileSync(join(DIR, "192.168.1.10+2-key.pem")),
  cert: readFileSync(join(DIR, "192.168.1.10+2.pem")),
};

// Puerto HTTPS (tablets) -> puerto HTTP del app (dev)
const ROUTES = {
  store: { https: 8443, http: 3000 },
  admin: { https: 8444, http: 3001 },
  cajero: { https: 8445, http: 3002 },
  mesero: { https: 8446, http: 3003 },
};

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
