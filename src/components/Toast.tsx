"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; title: string; desc?: string; ms?: number };

type Ctx = {
  push: (kind: ToastKind, title: string, desc?: string, ms?: number) => void;
  success: (title: string, desc?: string, ms?: number) => void;
  error: (title: string, desc?: string, ms?: number) => void;
  info: (title: string, desc?: string, ms?: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, desc?: string, ms = 2800) => {
      const id = Math.random().toString(36).slice(2);
      const t: Toast = { id, kind, title, desc, ms };
      setItems((prev) => [t, ...prev]);
      // auto dismiss
      setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const api: Ctx = useMemo(
    () => ({
      push,
      success: (t, d, ms) => push("success", t, d, ms),
      error: (t, d, ms) => push("error", t, d, ms),
      info: (t, d, ms) => push("info", t, d, ms),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* toast viewport */}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[320px] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto overflow-hidden rounded-lg border p-3 shadow-lg backdrop-blur",
              t.kind === "success" && "border-emerald-700/40 bg-emerald-900/40 text-emerald-50",
              t.kind === "error" && "border-rose-700/40 bg-rose-900/40 text-rose-50",
              t.kind === "info" && "border-slate-700/40 bg-slate-900/40 text-slate-50",
              "animate-[toastIn_180ms_ease-out] will-change-transform",
            ].join(" ")}
            style={{
              // simple slide+fade animation
              animationName: "toastIn",
            }}
          >
            <div className="text-sm font-medium">{t.title}</div>
            {t.desc ? <div className="mt-0.5 text-xs opacity-80">{t.desc}</div> : null}
            <button
              onClick={() => remove(t.id)}
              className="absolute right-2 top-2 rounded px-1 text-xs opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
