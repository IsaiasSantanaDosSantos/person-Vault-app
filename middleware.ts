import { NextRequest, NextResponse } from "next/server";
import { checkShareRateLimit } from "./lib/rateLimit";

/**
 * Este middleware NÃO faz nenhuma decisão de autenticação/autorização —
 * a proteção real dos dados continua sendo o Row Level Security do
 * Supabase (supabase/schema.sql). Ele existe pra: (1) gerar um nonce por
 * requisição e montar a Content-Security-Policy, que é o que impede um
 * eventual XSS de conseguir chamar getKey()/decryptText() e exfiltrar o
 * cofre — ver AUDITORIA_SEGURANCA.md, achados #3 e #5; e (2) aplicar um
 * throttle leve em /share/* (lib/rateLimit.ts), como camada extra contra
 * enumeração de links — sem Upstash configurado, isso vira no-op.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/share/")) {
    const allowed = await checkShareRateLimit(request.headers);
    if (!allowed) {
      return new NextResponse("Muitas requisições. Tente novamente em instantes.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // O webpack devtool do `next dev` (hot reload) roda módulos via eval() —
  // sem 'unsafe-eval' o HMR quebra em desenvolvimento. Em produção o
  // build não usa eval, então a CSP fica estrita de verdade.
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ${supabaseUrl};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
