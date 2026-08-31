import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "cajero.session-token"
    : "cajero.session-token.dev";

const handler = NextAuth(authOptions);

/**
 * Convierte la cookie de sesión en una "cookie de sesión" del navegador:
 * quita Expires/Max-Age para que se borre al cerrar el navegador y así
 * el usuario quede deslogueado automáticamente.
 */
function toSessionCookie(cookieHeader: string): string {
  if (!cookieHeader.startsWith(SESSION_COOKIE_NAME)) return cookieHeader;
  const attributes = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const name = part.split("=")[0].toLowerCase();
      return name !== "expires" && name !== "max-age";
    });
  return attributes.filter(Boolean).join("; ");
}

function makeSessionOnly(res: Response): Response {
  const headersWithGet = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof headersWithGet.getSetCookie === "function"
      ? headersWithGet.getSetCookie()
      : [];
  if (setCookies.length === 0) return res;

  const headers = new Headers(res.headers);
  headers.delete("Set-Cookie");
  for (const cookie of setCookies) {
    headers.append("Set-Cookie", toSessionCookie(cookie));
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function GET(req: Request, ctx: unknown) {
  return makeSessionOnly(await handler(req, ctx));
}

export async function POST(req: Request, ctx: unknown) {
  return makeSessionOnly(await handler(req, ctx));
}