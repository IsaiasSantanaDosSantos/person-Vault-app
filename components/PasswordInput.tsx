"use client";

import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoFocus,
  mono,
  surface = "panel",
  wrapperClassName,
  visible: controlledVisible,
  onVisibleChange,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  mono?: boolean;
  /** "panel" pra campos direto sobre o fundo da página; "bg" pra campos dentro de um card/modal vault-panel. */
  surface?: "panel" | "bg";
  wrapperClassName?: string;
  /** Passe visible + onVisibleChange pra controlar a exibição de fora (ex: revelar após gerar senha). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isControlled = controlledVisible !== undefined;
  const shown = isControlled ? controlledVisible : internalVisible;

  function toggle() {
    const next = !shown;
    if (isControlled) onVisibleChange?.(next);
    else setInternalVisible(next);
  }

  const bgClass = surface === "panel" ? "bg-vault-panel" : "bg-vault-bg";

  return (
    <div className={`relative ${wrapperClassName ?? ""}`}>
      <input
        type={shown ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${bgClass} border border-vault-border rounded-md pl-3 pr-10 py-2 text-sm outline-none focus:border-vault-steel ${
          mono ? "font-mono" : ""
        }`}
      />
      <button
        type="button"
        onClick={toggle}
        tabIndex={-1}
        title={shown ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text transition"
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.1 4.1M6.5 6.6C4 8.3 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
      <path d="M9.5 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" />
    </svg>
  );
}
