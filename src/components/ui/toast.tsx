"use client";

import { useState, useCallback, useEffect, createContext, useContext } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => {
            const colors = {
              success: { bg: "var(--positive-dim)", border: "var(--positive)", color: "var(--positive)" },
              error: { bg: "var(--negative-dim)", border: "var(--negative)", color: "var(--negative)" },
              info: { bg: "var(--info-dim)", border: "var(--info)", color: "var(--info)" },
            };
            const c = colors[toast.type];
            return (
              <div
                key={toast.id}
                style={{
                  background: "var(--bg-surface)",
                  border: `1px solid ${c.border}`,
                  borderLeft: `3px solid ${c.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: c.color,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  animation: "slideUp 0.2s ease",
                  pointerEvents: "auto",
                  maxWidth: 320,
                }}
              >
                {toast.message}
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}