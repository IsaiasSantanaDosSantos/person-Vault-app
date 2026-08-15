"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface TurnstileHandle {
  reset: () => void;
}

/**
 * Widget do Cloudflare Turnstile, usado antes de entrar/criar conta/recuperar
 * senha (app/login/page.tsx) — o Supabase exige um captchaToken válido
 * nesses três fluxos quando a proteção está ligada no painel dele (ver
 * MFA.md/README.md pra ativação). Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * configurada, não renderiza nada — mesmo padrão de "vira no-op sem a env
 * var" do rate limiting (lib/rateLimit.ts), pra não quebrar local/CI
 * enquanto a conta da Cloudflare não existir.
 */
const Turnstile = forwardRef<TurnstileHandle, { onVerify: (token: string) => void }>(
  function Turnstile({ onVerify }, ref) {
    const rawId = useId();
    const containerId = `turnstile-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const widgetId = useRef<string | null>(null);
    const [scriptReady, setScriptReady] = useState(false);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      if (!scriptReady || !SITE_KEY || !window.turnstile) return;
      widgetId.current = window.turnstile.render(`#${containerId}`, {
        sitekey: SITE_KEY,
        theme: "dark",
        callback: onVerify,
      });
      return () => {
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scriptReady]);

    if (!SITE_KEY) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
        <div id={containerId} />
      </>
    );
  }
);

export default Turnstile;
