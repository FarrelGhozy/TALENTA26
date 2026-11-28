import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl';
}

const MODAL_SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(selector) || [])
      .filter((element) => element.getClientRects().length > 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const items = focusable();
        if (!items.length) {
          e.preventDefault();
          dialogRef.current?.focus();
        } else if (e.shiftKey && (document.activeElement === items[0] || !dialogRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && (document.activeElement === items[items.length - 1] || !dialogRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    (focusable()[0] || dialogRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200/90 ${MODAL_SIZE_CLASSES[size]} w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 id="modal-title" className="font-bold text-slate-900 text-base tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="text-slate-400 hover:text-slate-600 rounded-xl p-2 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 text-sm leading-relaxed text-slate-700 space-y-4 overflow-y-auto flex-1">{children}</div>
        {footer ? (
          <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        ) : (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end shrink-0">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
