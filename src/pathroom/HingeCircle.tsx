import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ContactRound,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import { ContactButton } from '@/components/circle/ContactButton';
import { CircleBrand } from '@/components/circle/CircleBrand';
import { WhisperButton } from '@/components/circle/WhisperButton';
import { addPersonTags, ingestQuickAdd, type QuickAddInput } from '@/lib/circleIngest';
import type { ContactablePerson } from '@/lib/primaryContact';
import { runBoxQuery } from '@/lib/theRead';
import {
  detectContactShortcut,
  firstName,
  inferMeetingContext,
  meetingContextTag,
  pickedContactToQuickAdd,
  summarizeContact,
  type PickedContact,
} from '@/lib/hinge';
import { haptics } from '@/utils/haptics';
import { clearPendingClue, readPendingClue } from '@/lib/pendingClue';
import './circle-system.css';
import './hinge.css';

type View = 'capture' | 'saved' | 'ask' | 'result';
type Busy = 'reading' | 'saving' | 'finding' | 'context' | null;
type CaptureKind = 'manual_add' | 'business_card_photo';

interface LastSaved {
  id: string;
  name: string;
}

interface HingeMatch {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  why: string;
  confidence: string;
  source: string;
}

interface ContactPickerApi {
  select: (
    properties: Array<'name' | 'email' | 'tel'>,
    options: { multiple: boolean },
  ) => Promise<PickedContact[]>;
}

type NavigatorWithContacts = Navigator & { contacts?: ContactPickerApi };

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

const parseFields = (value: Record<string, string | null>, notes: string): QuickAddInput => ({
  name: (value.name ?? '').trim(),
  email: value.email,
  phone: value.phone,
  company: value.company,
  title: value.title,
  city: value.city,
  specialty_summary: value.specialty_summary,
  linkedin_url: value.linkedin_url,
  instagram_handle: value.instagram_handle,
  website: value.website,
  detected_platform: value.platform,
  notes,
});

export default function HingeCircle() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('capture');
  const [busy, setBusy] = useState<Busy>(null);
  const [clue, setClue] = useState(readPendingClue);
  const [ask, setAsk] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to keep a clue.');
  const [pendingDraft, setPendingDraft] = useState<QuickAddInput | null>(null);
  const [captureKind, setCaptureKind] = useState<CaptureKind>('manual_add');
  const [savedName, setSavedName] = useState('');
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null);
  const [meetingContext, setMeetingContext] = useState('');
  const [lastSaved, setLastSaved] = useState<LastSaved | null>(null);
  const [matches, setMatches] = useState<HingeMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [contactable, setContactable] = useState<ContactablePerson | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clueInputRef = useRef<HTMLTextAreaElement>(null);

  const currentMatch = matches[matchIndex] ?? null;
  const displayInitials = (() => {
    const source = user?.user_metadata?.full_name || user?.email || 'Circle user';
    return String(source).split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  })();

  const loadLastSaved = useCallback(async () => {
    if (!user) {
      setLastSaved(null);
      return;
    }
    const { data } = await supabase
      .from('circle_person')
      .select('id, display_name')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLastSaved({ id: data.id, name: data.display_name });
  }, [user]);

  useEffect(() => {
    void loadLastSaved();
  }, [loadLastSaved]);


  const parseClue = async (raw: string): Promise<QuickAddInput> => {
    const shortcut = detectContactShortcut(raw);
    if (shortcut) return shortcut;
    const { data, error: parseError } = await supabase.functions.invoke('parse-voice-contact', {
      body: { transcript: raw },
    });
    if (parseError) throw parseError;
    const parsed = (data as { parsed?: Record<string, string | null> } | null)?.parsed ?? {};
    const input = parseFields(parsed, raw);
    if (!input.name) throw new Error('Add their name so I know who to keep.');
    return input;
  };

  const resetCapture = () => {
    setView('capture');
    setBusy(null);
    setClue('');
    setPendingDraft(null);
    setCaptureKind('manual_add');
    setError(null);
    setMeetingContext('');
    setStatus('Done. Circle will handle the rest.');
  };

  const handleKeep = async () => {
    if (!user || busy) return;
    const raw = clue.trim();
    if (!raw && !pendingDraft?.name?.trim()) {
      setError('Add one clue first.');
      clueInputRef.current?.focus();
      return;
    }
    haptics.tap();
    setBusy('reading');
    setError(null);
    setStatus('Reading your clue.');
    try {
      const input = pendingDraft?.name?.trim()
        ? { ...pendingDraft, notes: [pendingDraft.notes, raw].filter(Boolean).join('\n') }
        : await parseClue(raw);
      setBusy('saving');
      setStatus('Keeping the raw clue.');
      const { circlePersonId } = await ingestQuickAdd(user.id, input, {
        kind: captureKind,
        label: captureKind === 'business_card_photo' ? 'Quick adds (photo)' : 'Quick adds',
      });
      const name = input.name.trim();
      setSavedName(name);
      setSavedPersonId(circlePersonId);
      setMeetingContext(inferMeetingContext(raw));
      setView('saved');
      clearPendingClue();
      setStatus(`${firstName(name)} is saved.`);
      await loadLastSaved();
      haptics.success();
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'I could not keep that. Try again.');
      setStatus('The clue was not saved.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const handlePhoto = async (file: File | null | undefined) => {
    if (!file || busy) return;
    setBusy('reading');
    setError(null);
    setStatus('Reading the photo.');
    try {
      const image = await fileToBase64(file);
      const { data, error: parseError } = await supabase.functions.invoke('parse-contact-image', {
        body: { image },
      });
      if (parseError) throw parseError;
      const parsed = (data as { parsed?: Record<string, string | null> } | null)?.parsed ?? {};
      const draft = parseFields(parsed, 'Added from a photo');
      setPendingDraft(draft);
      setCaptureKind('business_card_photo');
      setClue(draft.name ? summarizeContact(draft) : '');
      setError(draft.name ? null : 'I could not make out the name. Type their name here.');
      setStatus('Photo added. Nothing is saved yet.');
      haptics.tap();
      window.setTimeout(() => clueInputRef.current?.focus(), 0);
    } catch {
      setPendingDraft(null);
      setCaptureKind('manual_add');
      setError('I could not read that photo. Type or paste what you know.');
      setStatus('Photo was not added.');
      haptics.error();
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleContactPicker = async () => {
    if (busy) return;
    const contacts = (navigator as NavigatorWithContacts).contacts;
    if (!contacts?.select) {
      setError('Your browser cannot open contacts here. Paste or type what you have.');
      setStatus('Type or paste a contact instead.');
      clueInputRef.current?.focus();
      return;
    }
    setError(null);
    try {
      const picked = await contacts.select(['name', 'email', 'tel'], { multiple: false });
      const draft = pickedContactToQuickAdd(picked[0] ?? {});
      if (!draft) throw new Error('No named contact selected');
      setPendingDraft(draft);
      setCaptureKind('manual_add');
      setClue(summarizeContact(draft));
      setStatus('Contact added. Nothing is saved yet.');
      haptics.tap();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError('I could not open that contact. Paste or type what you have.');
      setStatus('Contact was not added.');
    }
  };

  const handleContext = async () => {
    if (busy) return;
    const tag = meetingContextTag(meetingContext);
    if (!tag || !savedPersonId) {
      resetCapture();
      return;
    }
    setBusy('context');
    setError(null);
    try {
      await addPersonTags(savedPersonId, [tag]);
      setStatus('Where you met is saved.');
      haptics.success();
      resetCapture();
    } catch {
      setError('I saved the person, but not where you met. Try that part again.');
      setStatus('Meeting place was not saved.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const loadContactable = async (id: string) => {
    const { data } = await supabase
      .from('circle_person')
      .select('id, display_name, primary_email, primary_phone, linkedin_url, handles')
      .eq('id', id)
      .maybeSingle();
    setContactable((data as ContactablePerson | null) ?? null);
  };

  const handleFind = async () => {
    const query = ask.trim();
    if (!query || busy) {
      if (!query) {
        setError('Say who you need or what you are testing.');
        setStatus('Add a little more first.');
      }
      return;
    }
    setBusy('finding');
    setError(null);
    setStatus('Checking your saved circle.');
    haptics.tap();
    try {
      const result = await runBoxQuery(query);
      if (result.upgrade) {
        setError('Your whole-network search is not switched on yet. Try a name from your Circle.');
        setStatus('No search was run.');
        return;
      }
      const nextMatches: HingeMatch[] = result.intent === 'find_people'
        ? (result.found ?? []).map((person) => ({
            id: person.id,
            name: person.name,
            title: person.title,
            company: person.company,
            why: person.why,
            confidence: (person.confidence ?? 0) >= 0.72 ? 'Strong match' : 'Possible match',
            source: person.matched_on ? `Matched on ${person.matched_on}` : 'From your saved circle',
          }))
        : (result.working ?? []).map((person) => ({
            id: person.id,
            name: person.name,
            title: person.title,
            company: person.company,
            why: person.why,
            confidence: 'Useful now',
            source: 'From the people and clues you saved',
          }));
      if (!nextMatches.length) {
        setError('No one clear yet. Try a name, skill, company, or a little more detail.');
        setStatus('No clear match found.');
        return;
      }
      setMatches(nextMatches);
      setMatchIndex(0);
      await loadContactable(nextMatches[0].id);
      setView('result');
      setStatus(`Found ${nextMatches[0].name}.`);
      haptics.success();
    } catch {
      setError('I could not search just now. Your saved clues are still safe.');
      setStatus('Search failed.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const showAnother = async () => {
    if (matches.length <= 1) {
      setStatus('No stronger match found.');
      return;
    }
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    await loadContactable(matches[next].id);
    setStatus(`Showing ${matches[next].name}.`);
  };

  const changeClue = (next: string) => {
    setClue(next);
    setError(null);
    if (pendingDraft?.name) {
      if (next !== summarizeContact(pendingDraft)) {
        setPendingDraft(null);
        setCaptureKind('manual_add');
      }
    } else if (pendingDraft) {
      setPendingDraft({ ...pendingDraft, name: next });
    }
  };

  const goToAsk = () => {
    setView('ask');
    setError(null);
    setStatus('Ready to find one person.');
  };

  const goToCapture = () => {
    setView('capture');
    setError(null);
    setStatus('Ready to keep a clue.');
  };

  return (
    <div className="circle-system hinge-app" data-state={view}>
      <header className="hinge-topbar">
        <div className="hinge-topbar-inner">
          <CircleBrand className="hinge-brand" />
          <button className="hinge-profile" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            {displayInitials}
          </button>
        </div>
      </header>

      <section className="hinge-upper" aria-label="Circle status">
        <div className="hinge-upper-inner">
          <div className="hinge-quiet">
            <h1>Nothing needs you.</h1>
            <p>Circle keeps the clues, checks the details, and brings back a person when they can help.</p>
          </div>
          <div className="hinge-last">
            <div className="hinge-eyebrow">Last saved</div>
            <div className="hinge-last-name">{lastSaved?.name ?? 'No one yet'}</div>
            <div className="hinge-last-clue">{lastSaved ? 'Ready when they matter' : 'Your first clue is enough'}</div>
          </div>
        </div>
      </section>

      <section className="hinge-plane" aria-label="Circle working plane">
        <div className="hinge-seam" aria-hidden="true" />
        <div className="hinge-point" aria-hidden="true" />

        <div className="hinge-plane-state hinge-capture">
          <div className="hinge-intent-column">
            <div>
              <div className="hinge-intent"><span />Looks like a new person</div>
              <div className="hinge-intent-copy">This is my best read. Nothing saves until you tap Keep.</div>
            </div>
            <button className="hinge-correction" onClick={goToAsk}>Find someone instead</button>
          </div>

          <div className="hinge-work-column">
            <label className="hinge-work-label" htmlFor="hinge-clue">Your clue</label>
            <textarea
              ref={clueInputRef}
              className="hinge-work-input"
              id="hinge-clue"
              value={clue}
              onChange={(event) => changeClue(event.target.value)}
              placeholder="A name, link, email, or anything you remember"
              disabled={busy === 'saving'}
            />
            <div className="hinge-inline-message" data-error={Boolean(error)}>{error ?? (busy === 'reading' ? 'Reading your clue...' : '')}</div>
            <div className="hinge-source-row" aria-label="Add another clue">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => void handlePhoto(event.target.files?.[0])}
              />
              <button className="hinge-source-button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busy)}>
                <ImageIcon aria-hidden="true" />Photo
              </button>
              <WhisperButton
                className="hinge-source-button"
                disabled={Boolean(busy)}
                onTranscript={(transcript) => {
                  setClue(transcript);
                  setPendingDraft(null);
                  setCaptureKind('manual_add');
                  setError(null);
                  haptics.tap();
                }}
                onError={(message) => {
                  setError(message || null);
                  if (message) haptics.error();
                }}
                onStatus={setStatus}
              />
              <button className="hinge-source-button" onClick={() => void handleContactPicker()} disabled={Boolean(busy)}>
                <ContactRound aria-hidden="true" />Contact
              </button>
            </div>
          </div>

          <div className="hinge-action-column">
            <button className="hinge-primary-action" onClick={() => void handleKeep()} disabled={Boolean(busy)}>
              <span>{busy === 'reading' ? 'Reading...' : busy === 'saving' ? 'Keeping...' : 'Keep clue'}</span>
              {busy ? <Loader2 className="hinge-spin" aria-hidden="true" /> : <ArrowUpRight className="hinge-arrow" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="hinge-plane-state hinge-ask">
          <div className="hinge-intent-column">
            <div>
              <div className="hinge-intent"><span />Finding one person</div>
              <div className="hinge-intent-copy">Circle will use your saved clues, not a web guess.</div>
            </div>
            <button className="hinge-correction" onClick={goToCapture}>Save a clue instead</button>
          </div>

          <div className="hinge-work-column">
            <label className="hinge-work-label" htmlFor="hinge-ask">What do you need?</label>
            <textarea
              className="hinge-work-input"
              id="hinge-ask"
              value={ask}
              onChange={(event) => { setAsk(event.target.value); setError(null); }}
              placeholder="A person by name, or help with an idea"
              disabled={busy === 'finding'}
            />
            <div className="hinge-inline-message" data-error={Boolean(error)}>{error ?? (busy === 'finding' ? 'Checking your Circle...' : '')}</div>
            <div className="hinge-source-row hinge-ask-sources" aria-label="Another way to ask">
              <WhisperButton
                className="hinge-source-button"
                disabled={Boolean(busy)}
                onTranscript={(transcript) => {
                  setAsk(transcript);
                  setError(null);
                  haptics.tap();
                }}
                onError={(message) => {
                  setError(message || null);
                  if (message) haptics.error();
                }}
                onStatus={setStatus}
              />
            </div>
          </div>

          <div className="hinge-action-column">
            <button className="hinge-primary-action" onClick={() => void handleFind()} disabled={Boolean(busy)}>
              <span>{busy === 'finding' ? 'Finding...' : 'Find'}</span>
              {busy === 'finding' ? <Loader2 className="hinge-spin" aria-hidden="true" /> : <ArrowUpRight className="hinge-arrow" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="hinge-plane-state hinge-saved">
          <div className="hinge-saved-signal" aria-hidden="true"><Check /></div>
          <div className="hinge-saved-copy">
            <h2>{firstName(savedName)} is safe.</h2>
            <p>Raw clue kept. Circle is checking the details.</p>
            <div className="hinge-context-line">
              <label htmlFor="hinge-context">Where did you meet?</label>
              <div className="hinge-context-control">
                <input
                  id="hinge-context"
                  value={meetingContext}
                  onChange={(event) => setMeetingContext(event.target.value)}
                  placeholder="Optional"
                  autoFocus
                />
                <WhisperButton
                  className="hinge-context-voice"
                  showText={false}
                  idleLabel="Add where you met by voice"
                  disabled={Boolean(busy)}
                  onTranscript={(transcript) => {
                    setMeetingContext(transcript);
                    setError(null);
                  }}
                  onError={(message) => setError(message || null)}
                  onStatus={setStatus}
                />
              </div>
            </div>
            {error && <div className="hinge-saved-error">{error}</div>}
          </div>
          <div className="hinge-saved-actions">
            <button className="hinge-plain-action" onClick={resetCapture}>Skip</button>
            <button className="hinge-plain-action primary" onClick={() => void handleContext()} disabled={busy === 'context'}>
              {busy === 'context' ? 'Adding...' : 'Add this'}
            </button>
          </div>
        </div>

        <div className="hinge-plane-state hinge-result">
          <div className="hinge-result-meta">
            <div className="hinge-confidence"><span />{currentMatch?.confidence ?? 'Match'}</div>
            <button className="hinge-correction" onClick={goToAsk}>Change the ask</button>
          </div>
          <div className="hinge-result-person">
            <h2>{currentMatch?.name}</h2>
            <div className="hinge-result-role">{[currentMatch?.title, currentMatch?.company].filter(Boolean).join(' at ')}</div>
            <p>{currentMatch?.why}</p>
            <div className="hinge-result-source">{currentMatch?.source}</div>
          </div>
          <div className="hinge-result-actions">
            <button className="hinge-plain-action" onClick={() => void showAnother()}>Show another</button>
            {contactable ? (
              <ContactButton person={contactable} raws={[]} className="hinge-result-contact" />
            ) : (
              <button className="hinge-plain-action primary" disabled>Use {firstName(currentMatch?.name ?? 'person')}</button>
            )}
          </div>
        </div>
      </section>

      <div className="hinge-sr-status" role="status" aria-live="polite">{status}</div>
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
