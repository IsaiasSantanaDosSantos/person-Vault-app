"use client";

import { useEffect, useState } from "react";

export default function Screenshot({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);

  // Confere se a imagem carrega através de um probe próprio (em vez de
  // confiar só no onError da tag renderizada) — mais confiável, e some
  // sozinho assim que o print de verdade for adicionado em public/guide/.
  useEffect(() => {
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setBroken(false);
    };
    probe.onerror = () => {
      if (!cancelled) setBroken(true);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="my-4 rounded-lg border border-vault-border overflow-hidden bg-vault-panel">
      {!broken ? (
        <img src={src} alt={alt} onError={() => setBroken(true)} className="w-full block" />
      ) : (
        <div className="aspect-[9/16] max-h-[420px] flex items-center justify-center p-6 text-center">
          <p className="text-xs text-vault-muted">Print ainda não adicionado — {alt}</p>
        </div>
      )}
    </div>
  );
}
