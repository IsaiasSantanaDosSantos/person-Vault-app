import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Throttling de borda só pras nossas próprias rotas de página — hoje,
 * na prática, só /share/[id] (ver middleware.ts). Abuso de login/cadastro
 * não passa por aqui: aquele tráfego vai direto do navegador pro Supabase
 * (ver AUDITORIA_SEGURANCA.md), e é configuração do painel dele
 * (hCaptcha/Turnstile), não algo que dê pra limitar em código aqui.
 *
 * Sem UPSTASH_REDIS_REST_URL/TOKEN configurados (ex: local, CI), vira
 * no-op — sempre libera. Isso é proposital: essa é uma camada extra de
 * mitigação de abuso, não a fronteira de segurança real do app (essa
 * continua sendo o RLS do Supabase + a criptografia zero-knowledge).
 */

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function buildRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "cofre-share-rl",
  });
}

/** true = pode seguir; false = excedeu o limite. Falha aberta em qualquer erro. */
export async function checkShareRateLimit(headers: Headers): Promise<boolean> {
  try {
    const limiter = buildRatelimit();
    if (!limiter) return true;
    const ip = getClientIp(headers);
    const { success } = await limiter.limit(ip);
    return success;
  } catch {
    return true;
  }
}
