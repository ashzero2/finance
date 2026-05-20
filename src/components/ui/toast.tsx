"use client";

import { useState, useCallback, useRef, createContext, useContext } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  onUndo?: () => void;
  undone?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info", options?: { onUndo?: () => void }) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success", options?: { onUndo?: () => void }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type, onUndo: options?.onUndo }]);

      const duration = options?.onUndo ? 5000 : 3000; // longer for undo toasts
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    []
  );

  const handleUndo = useCallback((toast: Toast) => {
    // Mark as undone and remove
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    const timer = timersRef.current.get(toast.id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toast.id);
    }
    toast.onUndo?.();
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
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
                  maxWidth: 360,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ flex: 1 }}>{toast.message}</span>
                {toast.onUndo && (
                  <button
                    onClick={() => handleUndo(toast)}
                    style={{
                      background: "none",
                      border: "1px solid currentColor",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 10px",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Undo
                  </button>
                )}
                {!toast.onUndo && (
                  <button
                    onClick={() => dismiss(toast.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: 2,
                      fontSize: 14,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}