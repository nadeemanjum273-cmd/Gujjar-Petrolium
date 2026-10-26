import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  type?: 'info' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive = false,
  type,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
  children,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDanger = isDestructive || type === 'danger';
  const finalConfirmLabel = confirmText || confirmLabel || 'ہاں، تصدیق کریں';
  const finalCancelLabel = cancelText || cancelLabel || 'منسوخ کریں';
  const handleCancel = onCancel || onClose || (() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              isDanger ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-700'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 font-urdu">{title}</h3>
            {message && (
              <p className="text-sm text-slate-600 mt-1 font-urdu leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        {children && <div className="mt-2">{children}</div>}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 font-urdu">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {finalCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-navy-900 hover:bg-navy-800'
            }`}
          >
            {loading ? 'عمل جاری ہے...' : finalConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
