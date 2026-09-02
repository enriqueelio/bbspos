import https from "https";
import fs from "fs";
import httpProxy from "http-proxy";

const { createProxyServer } = httpProxy;

const [,, sourceArg, targetArg] = process.argv;
const source = parseInt(sourceArg);
const target = parseInt(targetArg);

const dir = "C:\\Users\\PC-ENRIQUE\\Documents\\bubba";
const cert = fs.readFileSync(dir + "\\192.168.1.10+2.pem");
const key = fs.readFileSync(dir + "\\192.168.1.10+2-key.pem");

const proxy = createProxyServer({ xfwd: true });
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

server.listen(source, "0.0.0.0", () => {
  console.log(`HTTPS proxy [${source}] -> http://localhost:${target} (http-proxy)`);
});
