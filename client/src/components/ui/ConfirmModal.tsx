import type { ReactNode } from 'react';
import { useEffect } from 'react';

export interface ConfirmModalDetail {
  label: string;
  value: ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  details?: ConfirmModalDetail[];
  icon?: ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  details = [],
  icon,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const accentColor = isDanger
    ? 'border-red-500/40 shadow-red-950/40 text-red-400'
    : isWarning
      ? 'border-[var(--color-brass)]/40 shadow-amber-950/40 text-[var(--color-brass)]'
      : 'border-blue-500/40 shadow-blue-950/40 text-blue-400';

  const confirmBtnStyles = isDanger
    ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-900/30'
    : isWarning
      ? 'bg-[var(--color-brass)] hover:bg-[var(--color-brass-deep)] text-[var(--color-espresso)] shadow-lg shadow-amber-950/30'
      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-[var(--color-umber)] p-6 shadow-2xl transition-all sm:p-7 ${accentColor}`}
        style={{
          boxShadow: isDanger
            ? '0 20px 50px -10px rgba(138, 46, 46, 0.45), 0 0 0 1px rgba(239, 68, 68, 0.2)'
            : '0 20px 50px -10px rgba(200, 133, 58, 0.35), 0 0 0 1px rgba(200, 133, 58, 0.25)',
        }}
      >
        {/* Subtle Ambient Glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl"
          style={{
            background: isDanger
              ? 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(200,133,58,0.25) 0%, transparent 70%)',
          }}
        />

        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
              isDanger
                ? 'border-red-500/30 bg-red-950/50 text-red-400'
                : 'border-[var(--color-brass)]/30 bg-[var(--color-brass)]/15 text-[var(--color-brass)]'
            }`}
          >
            {icon ? (
              icon
            ) : isDanger ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            )}
          </div>

          {/* Heading and description */}
          <div className="min-w-0 flex-1">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-wide text-[var(--color-cream)]">
              {title}
            </h3>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-cream-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Optional Details Table / Grid */}
        {details.length > 0 && (
          <div className="mt-5 rounded-xl border border-[var(--color-brass)]/20 bg-[var(--color-espresso)]/70 p-4 space-y-2.5">
            {details.map((detail, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 text-xs sm:text-sm border-b border-[var(--color-brass)]/10 pb-2 last:border-b-0 last:pb-0"
              >
                <span className="font-medium text-[var(--color-cream-muted)]">{detail.label}</span>
                <span className="font-semibold text-[var(--color-cream)] truncate max-w-[200px]">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Warning Callout for Danger */}
        {isDanger && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            <svg
              className="h-4 w-4 shrink-0 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>This action is permanent and cannot be undone.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-[var(--color-brass)]/30 bg-[var(--color-espresso)]/80 px-4 py-2.5 text-sm font-medium text-[var(--color-cream-muted)] transition hover:bg-[var(--color-espresso)] hover:text-[var(--color-cream)] hover:border-[var(--color-brass)]/60 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${confirmBtnStyles}`}
          >
            {isLoading && (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
