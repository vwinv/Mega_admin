"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary:
      "bg-gradient-to-r from-mega-500 to-mega-600 text-white shadow-md shadow-mega-500/25 hover:from-mega-600 hover:to-mega-700 hover:shadow-lg",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    danger:
      "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800",
    ghost: "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
  };
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mega-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-mega-500 focus:outline-none focus:ring-4 focus:ring-mega-500/10 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}
      <select
        className={`w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-mega-500 focus:outline-none focus:ring-4 focus:ring-mega-500/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-6 ${className}`}>{children}</div>
  );
}

export function Alert({
  type = "error",
  children,
}: {
  type?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-red-200/80 bg-red-50/90 text-red-800",
    success: "border-mega-200/80 bg-mega-50/90 text-mega-800",
    info: "border-blue-200/80 bg-blue-50/90 text-blue-800",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 text-sm shadow-sm ${styles[type]}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mega-600">
          MEGA SN SARL
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

const statVariants = {
  default: {
    card: "border-slate-200/80 bg-white",
    accent: "bg-slate-100 text-slate-600",
    value: "text-slate-900",
  },
  positive: {
    card: "border-mega-200/60 bg-gradient-to-br from-mega-50/80 to-white",
    accent: "bg-mega-100 text-mega-700",
    value: "text-mega-800",
  },
  negative: {
    card: "border-red-200/60 bg-gradient-to-br from-red-50/80 to-white",
    accent: "bg-red-100 text-red-700",
    value: "text-red-800",
  },
  warning: {
    card: "border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white",
    accent: "bg-amber-100 text-amber-700",
    value: "text-amber-800",
  },
};

export function StatCard({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "positive" | "negative" | "warning";
}) {
  const v = statVariants[variant];

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${v.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${v.accent}`}>
          FCFA
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${v.value}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/60 p-12 text-center">
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function DataTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      <table className="data-table w-full text-sm">{children}</table>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 ${sizes[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function FormActions({
  onCancel,
  submitLabel = "Enregistrer",
  cancelLabel = "Annuler",
  loading = false,
  formId,
}: {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  formId?: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="submit" form={formId} disabled={loading}>
        {loading ? "Enregistrement…" : submitLabel}
      </Button>
    </div>
  );
}

export function Fab({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-mega-500 to-mega-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-mega-500/30 transition-all hover:scale-105 hover:shadow-xl lg:hidden"
      aria-label={label}
    >
      <span className="text-lg leading-none">+</span>
      {label}
    </button>
  );
}

export function StickyToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md">
      {children}
    </div>
  );
}
