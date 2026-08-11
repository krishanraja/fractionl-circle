import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleBrand } from '@/components/circle/CircleBrand';
import { WhisperButton } from '@/components/circle/WhisperButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  addPersonTags,
  ingestSharedContact,
  type QuickAddInput,
} from '@/lib/circleIngest';
import { detectContactShortcut, meetingContextTag } from '@/lib/hinge';
import { sharedDraftFromParsed, sharedInputFromDraft } from '@/lib/sharedContact';
import { readSharedScreenshot } from '@/utils/registerServiceWorker';
import { haptics } from '@/utils/haptics';
import '@/pathroom/circle-system.css';
import './share-contact.css';

type Phase = 'reading' | 'review' | 'saving' | 'done';
type FieldKey = 'name' | 'title' | 'company' | 'email' | 'phone' | 'linkedin_url';

const fields: Array<{ key: FieldKey; label: string; type?: string; autoComplete?: string }> = [
  { key: 'name', label: 'Name', autoComplete: 'name' },
  { key: 'title', label: 'Role', autoComplete: 'organization-title' },
  { key: 'company', label: 'Company', autoComplete: 'organization' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'linkedin_url', label: 'Profile link', type: 'url' },
];

const emptyDraft = (): QuickAddInput => ({ name: '' });

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Could not read the shared image'));
    reader.readAsDataURL(blob);
  });

const readPrefill = (value: string | null): Record<string, string | null> | null => {
  if (!value || value.length > 12_000) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, item]) => item === null || typeof item === 'string')
        .map(([key, item]) => [key, typeof item === 'string' ? item.slice(0, 2_000) : null]),
    );
  } catch {
    return null;
  }
};

export default function ShareContact() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('reading');
  const [draft, setDraft] = useState<QuickAddInput>(emptyDraft);
  const [meetingContext, setMeetingContext] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('Reading what you shared.');
  const [doneMessage, setDoneMessage] = useState('Circle will handle the rest and bring them back when they can help.');
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    let objectUrl: string | null = null;

    const finish = (next: QuickAddInput, nextNote: string) => {
      if (cancelled) return;
      setDraft(next);
      setNote(nextNote);
      setPhase('review');
    };

    const load = async () => {
      let fallbackNote = 'Shared with Circle';
      const prefill = readPrefill(params.get('prefill'));
      if (prefill) {
        const next = sharedDraftFromParsed(prefill, 'Shared with Circle');
        finish(next, next.name ? 'Check the details, then save the person.' : 'Add the name, then save the person.');
        return;
      }

      try {
        const shared = await readSharedScreenshot();
        const metaText = [shared.meta?.title, shared.meta?.text, shared.meta?.url]
          .filter((item): item is string => Boolean(item?.trim()))
          .join('\n')
          .trim();
        fallbackNote = metaText || (shared.blob ? 'Shared from a photo' : fallbackNote);

        if (shared.blob) {
          objectUrl = URL.createObjectURL(shared.blob);
          if (!cancelled) setPreviewUrl(objectUrl);
          const image = await blobToBase64(shared.blob);
          const { data, error: parseError } = await supabase.functions.invoke('parse-screenshot', {
            body: { image, mime: shared.blob.type || 'image/jpeg' },
          });
          if (parseError) throw parseError;
          const parsed = (data as { parsed?: Record<string, string | null> } | null)?.parsed ?? {};
          const next = sharedDraftFromParsed(parsed, metaText || 'Shared from a photo');
          finish(
            next,
            next.name
              ? 'I read the photo. Check the details, then save the person.'
              : 'I kept the photo. Add the name, then save the person.',
          );
          return;
        }

        if (metaText) {
          const shortcut = detectContactShortcut(metaText);
          if (shortcut) {
            finish(shortcut, 'Check the details, then save the person.');
            return;
          }
          const { data, error: parseError } = await supabase.functions.invoke('parse-voice-contact', {
            body: { transcript: metaText },
          });
          if (parseError) throw parseError;
          const parsed = (data as { parsed?: Record<string, string | null> } | null)?.parsed ?? {};
          const next = sharedDraftFromParsed(parsed, metaText);
          finish(next, next.name ? 'Check the details, then save the person.' : 'Add the name, then save the person.');
          return;
        }

        finish(emptyDraft(), params.has('error')
          ? 'The share did not come through. Add what you know here.'
          : 'Add whatever you know. A name is enough.');
      } catch {
        finish(
          { name: '', notes: fallbackNote },
          'I could not read that automatically. Add the name and anything else you know.',
        );
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [params]);

  const updateField = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value || null }));
    setError(null);
  };

  const handleSave = async () => {
    if (!user || phase === 'saving') return;
    if (!draft.name.trim()) {
      setError('Add their name first.');
      document.getElementById('shared-name')?.focus();
      return;
    }
    setPhase('saving');
    setError(null);
    try {
      const { circlePersonId } = await ingestSharedContact(user.id, sharedInputFromDraft(draft));
      const contextTag = meetingContextTag(meetingContext);
      if (contextTag) {
        if (!circlePersonId) {
          setDoneMessage('The person is saved. I could not add where you met, so keep that detail for later.');
        } else {
          try {
            await addPersonTags(circlePersonId, [contextTag]);
          } catch {
            setDoneMessage('The person is saved. I could not add where you met, so keep that detail for later.');
          }
        }
      }
      haptics.success();
      setPhase('done');
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'I could not save that. Try again.');
      setPhase('review');
      haptics.error();
    }
  };

  if (phase === 'reading') {
    return (
      <main className="circle-system share-page">
        <div className="share-reading" role="status" aria-live="polite">
          <div className="share-reading-mark" aria-hidden="true"><Loader2 /></div>
          <h1>Reading what you shared.</h1>
          <p>Nothing is saved yet.</p>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    return (
      <main className="circle-system share-page">
        <div className="share-done">
          <div className="share-done-mark" aria-hidden="true"><Check /></div>
          <div>
            <div className="share-eyebrow">Saved</div>
            <h1>{draft.name.trim()} is saved.</h1>
            <p>{doneMessage}</p>
          </div>
          <button className="share-primary" onClick={() => navigate('/')}>
            <span>Back to Circle</span><ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="circle-system share-page">
      <header className="share-topbar">
        <CircleBrand />
        <button className="share-back" onClick={() => navigate('/')}>
          <ArrowLeft aria-hidden="true" />Back
        </button>
      </header>

      <div className="share-shell">
        <section className="share-intro">
          <div className="share-eyebrow">Shared with Circle</div>
          <h1>Keep this person.</h1>
          <p>{note}</p>
        </section>

        <section className="share-card" aria-label="Check shared contact">
          {previewUrl && (
            <div className="share-preview">
              <img src={previewUrl} alt="Shared contact" />
              <div><ImageIcon aria-hidden="true" />Contact photo</div>
            </div>
          )}

          <div className="share-fields">
            {fields.map((field) => (
              <label className="share-field" key={field.key} htmlFor={`shared-${field.key}`}>
                <span>{field.label}{field.key === 'name' ? ' *' : ''}</span>
                <input
                  id={`shared-${field.key}`}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  value={(draft[field.key] as string | null | undefined) ?? ''}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.key === 'name' ? 'Who is this?' : 'Optional'}
                  aria-required={field.key === 'name'}
                />
              </label>
            ))}
          </div>

          <div className="share-context">
            <div>
              <label htmlFor="shared-context">Where did you meet?</label>
              <span>Optional</span>
            </div>
            <div className="share-context-control">
              <input
                id="shared-context"
                value={meetingContext}
                onChange={(event) => { setMeetingContext(event.target.value); setError(null); }}
                placeholder="Conference, school, online..."
              />
              <WhisperButton
                className="share-voice"
                showText={false}
                idleLabel="Add where you met by voice"
                disabled={phase === 'saving'}
                onTranscript={setMeetingContext}
                onError={(message) => setError(message || null)}
              />
            </div>
          </div>

          {error && <div className="share-error" role="alert">{error}</div>}

          <div className="share-actions">
            <button className="share-secondary" onClick={() => navigate('/')} disabled={phase === 'saving'}>Cancel</button>
            <button className="share-primary" onClick={() => void handleSave()} disabled={phase === 'saving'}>
              <span>{phase === 'saving' ? 'Saving...' : 'Save person'}</span>
              {phase === 'saving' ? <Loader2 className="share-spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
