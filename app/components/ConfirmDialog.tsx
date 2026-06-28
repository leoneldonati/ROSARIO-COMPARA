import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-accent-600 hover:bg-accent-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-bold text-primary-900 dark:text-primary-100 mb-2">
          {title}
        </h3>
        <div className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          {message}
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium transition text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950 disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition text-white cursor-pointer disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? <Spinner size={16} /> : null}
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
