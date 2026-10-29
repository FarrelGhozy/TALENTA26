import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

interface ToastContextType {
  notify: (message: string, kind?: ToastItem['kind']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const notify = useCallback((message: string, kind: ToastItem['kind'] = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="fixed bottom-5 right-5 z-[80] space-y-2.5 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto p-4 rounded-2xl border text-xs font-semibold shadow-xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              t.kind === 'success'
                ? 'border-emerald-200 bg-white/95 text-emerald-950 backdrop-blur-md'
                : t.kind === 'error'
                ? 'border-rose-200 bg-white/95 text-rose-950 backdrop-blur-md'
                : 'border-slate-200 bg-white/95 text-slate-900 backdrop-blur-md'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.kind === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {t.kind === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {t.kind === 'info' && <Info className="w-4 h-4 text-blue-700" />}
            </div>
            <div className="flex-1 leading-relaxed">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};