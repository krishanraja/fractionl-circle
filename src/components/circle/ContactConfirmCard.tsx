import type { ReactNode } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { QuickAddInput } from '@/lib/circleIngest';
import { TagChips } from './TagChips';

interface ContactConfirmCardProps {
  value: QuickAddInput;
  onChange: (next: QuickAddInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  errorMsg?: string;
  note?: string;
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
  note,
  preview,
}: ContactConfirmCardProps) => {
  const setField = (key: FieldKey, v: string) => {
    onChange({ ...value, [key]: v.length ? v : null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {preview}

      {note && <p className="sub" style={{ marginTop: 0 }}>{note}</p>}

      <div className="fieldcard">
        {FIELDS.map((f) => {
          const v = (value[f.key] as string | null | undefined) ?? '';
          const isName = f.key === 'name';
          return (
            <div key={f.key} className="fieldrow">
              <label htmlFor={`confirm-${f.key}`} className="fieldlabel">{f.label}</label>
              <input
                id={`confirm-${f.key}`}
                type={f.type ?? 'text'}
                autoComplete={f.autoComplete}
                value={v}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={isName ? 'Required' : '—'}
                aria-required={isName}
                style={isName ? { fontWeight: 600 } : undefined}
              />
            </div>
          );
        })}
      </div>

      <TagChips
        tags={value.tags ?? []}
        onChange={(tags) => onChange({ ...value, tags })}
        context={{ name: value.name, title: value.title, company: value.company, notes: value.notes }}
      />

      {errorMsg && (
        <div className="cerr" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <AlertCircle size={14} style={{ marginTop: 1, flex: '0 0 auto' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" className="ghostbtn" onClick={onCancel} disabled={saving} style={{ padding: '12px 16px' }}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="cta"
          style={{ flex: 1 }}
          onClick={onSave}
          disabled={saving || !(value.name ?? '').trim()}
        >
          <span className="ctaicon">
            {saving ? <Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} /> : <Check size={16} strokeWidth={2.5} />}
            {saving ? 'Saving…' : saveLabel}
          </span>
          <span className="mono">→</span>
        </button>
      </div>
    </div>
  );
};
