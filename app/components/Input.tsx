import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const baseInput =
  "w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition";

const labelClass =
  "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input className={`${baseInput} ${className}`} {...props} />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea className={`${baseInput} resize-y ${className}`} {...props} />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
