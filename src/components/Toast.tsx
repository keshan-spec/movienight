"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tone = "info" | "error";
type ToastAction = { label: string; run: () => void };
type Toast = { id: number; message: string; tone: Tone; action?: ToastAction };

type Notify = (message: string, options?: { tone?: Tone; action?: ToastAction }) => void;

const ToastContext = createContext<Notify>(() => {});

export function useToast(): Notify {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, options) => {
      const id = nextId.current++;
      const toast: Toast = { id, message, tone: options?.tone ?? "info", action: options?.action };
      setToasts((list) => [...list.slice(-2), toast]);
      setTimeout(() => dismiss(id), toast.action ? 7000 : 3800);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" data-tone={toast.tone} key={toast.id}>
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.run();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
