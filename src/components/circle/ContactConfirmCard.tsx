import type { ReactNode } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickAddInput } from '@/lib/circleIngest';

interface ContactConfirmCardProps {
  value: QuickAddInput;
  onChange: (next: QuickAddInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  errorMsg?: string;
  preview?: ReactNode;
}

type FieldKey =
  | 'name'
  | 'title'
  | 'company'
  | 'email'
  | 'phone'
  | 'city'
  | 'linkedin_url'
  | 'instagram_handle';

const FIELDS: { key: FieldKey; label: string; type?: string; autoComplete?: string }[] = [
  { key: 'name', label: 'Name', autoComplete: 'name' },
  { key: 'title', label: 'Title', autoComplete: 'organization-title' },
  { key: 'company', label: 'Company', autoComplete: 'organization' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url' },
  { key: 'instagram_handle', label: 'Instagram' },
];

export const ContactConfirmCard = ({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  saveLabel = 'Add to Circle',
  cancelLabel = 'Cancel',
  errorMsg,
  preview,
}: ContactConfirmCardProps) => {
  const setField = (key: FieldKey, v: string) => {
    onChange({ ...value, [key]: v.length ? v : null });
  };

  return (
    <div className="space-y-3">
      {preview}

      <div className="rounded-2xl bg-surface-muted/70 backdrop-blur divide-y divide-border/40 overflow-hidden">
        {FIELDS.map((f) => {
          const v = (value[f.key] as string | null | undefined) ?? '';
          const isName = f.key === 'name';
          return (
            <div key={f.key} className="flex items-center gap-3 px-4 py-3 focus-within:bg-card/40 transition-colors">
              <label
                htmlFor={`confirm-${f.key}`}
                className="w-24 shrink-0 text-xs font-medium text-foreground-muted"
              >
                {f.label}
              </label>
              <input
                id={`confirm-${f.key}`}
                type={f.type ?? 'text'}
                autoComplete={f.autoComplete}
                value={v}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={isName ? 'Required' : '—'}
                aria-required={isName}
                className={cn(
                  'flex-1 min-w-0 bg-transparent text-base text-foreground placeholder:text-foreground-muted/60 outline-none',
                  isName && 'font-semibold'
                )}
              />
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={cn(
            'h-12 px-5 rounded-full text-sm font-medium text-foreground-secondary',
            'hover:text-foreground transition-colors',
            'disabled:opacity-40'
          )}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !(value.name ?? '').trim()}
          className={cn(
            'flex-1 h-12 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold',
            'flex items-center justify-center gap-2 shadow-md shadow-primary/25',
            'active:scale-[0.98] transition-transform duration-100',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {saveLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
