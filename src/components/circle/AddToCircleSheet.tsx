import { useCallback, useEffect, useState } from 'react';
import { Camera, Clipboard, Mic, Type, ChevronRight, Sparkles, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickAddImage } from './QuickAddImage';
import { QuickAddPaste } from './QuickAddPaste';
import { QuickAddTyped } from './QuickAddTyped';
import { VoiceSeedCapture } from './VoiceSeedCapture';
import type { IngestResult } from '@/lib/circleIngest';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import { toast } from 'sonner';

// Heuristic: is the pasted text contact-shaped? URL, email, @-handle, or a
// signature-looking blob with a name + something else. False is the safe default.
const looksLikeContact = (raw: string): boolean => {
  const t = raw.trim();
  if (!t || t.length > 2000) return false;
  if (/^https?:\/\/(www\.)?(linkedin|instagram|x|twitter|tiktok|threads|github)\.com\//i.test(t)) return true;
  if (/^@[a-z0-9._]{2,30}$/i.test(t)) return true;
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t)) return true;
  return false;
};

// The first line of what was pasted, shown in full (it wraps where it renders) -
// no ellipsis. The complete paste is always captured regardless of this preview.
const shortPreview = (raw: string): string => raw.trim().split('\n')[0];

type Mode = 'image' | 'paste' | 'voice' | 'typed';

const MODES: { id: Mode; label: string; hint: string; icon: typeof Camera }[] = [
  { id: 'image', label: 'Screenshot or photo', hint: 'LinkedIn, business card, name tag', icon: Camera },
  { id: 'paste', label: 'Paste anything', hint: 'URL, handle, signature, bio', icon: Clipboard },
  { id: 'voice', label: 'Just say their name', hint: 'Use your voice', icon: Mic },
  { id: 'typed', label: 'Type a name', hint: 'Plus anything you remember', icon: Type },
];

interface AddToCircleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (result: IngestResult) => void;
  onConnectSourceClick?: () => void;
}

const SheetBody = ({
  mode,
  setMode,
  onAdded,
  onClose,
  onConnectSourceClick,
  clipboardHint,
  onUseClipboard,
  onDismissClipboard,
  pastePrefill,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onAdded?: (result: IngestResult) => void;
  onClose?: () => void;
  onConnectSourceClick?: () => void;
  clipboardHint: string | null;
  onUseClipboard: () => void;
  onDismissClipboard: () => void;
  pastePrefill?: string;
}) => {
  return (
    <div className="sheetwrap" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="ovl">Add someone</div>
        <div className="h" style={{ marginTop: 6 }}>Add to your circle</div>
        <div className="sub">Whatever you've got - a name, screenshot, link, voice memo.</div>
      </div>

      {clipboardHint && (
        <button className="modetile" style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 9 }} onClick={onUseClipboard}>
          <Sparkles size={16} style={{ color: 'var(--thx-accent)', flex: '0 0 auto' }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--thx-hi)', lineHeight: 1.35 }}>
            Use clipboard - <span style={{ color: 'var(--thx-mid)' }}>{clipboardHint}</span>
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Dismiss clipboard hint"
            onClick={(e) => { e.stopPropagation(); onDismissClipboard(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDismissClipboard(); } }}
            style={{ flex: '0 0 auto', color: 'var(--thx-lo)', display: 'inline-flex' }}
          >
            <X size={14} />
          </span>
        </button>
      )}

      <div role="radiogroup" aria-label="Choose add method" className="modegrid">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={active}
              onClick={() => { if (!active) haptics.tap(); setMode(m.id); }}
              className={cn('modetile', active && 'on')}
            >
              <div className="modeicon"><Icon size={18} strokeWidth={2} /></div>
              <div style={{ marginTop: 'auto' }}>
                <div className="modetitle">{m.label}</div>
                <div className="modehint">{m.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        {mode === 'image' && <QuickAddImage onDone={onAdded} onClose={onClose} />}
        {mode === 'paste' && <QuickAddPaste onDone={onAdded} onClose={onClose} prefill={pastePrefill} />}
        {mode === 'voice' && <VoiceSeedCapture onDone={onAdded} onClose={onClose} />}
        {mode === 'typed' && <QuickAddTyped onDone={onAdded} onClose={onClose} />}
      </div>

      {onConnectSourceClick && (
        <button className="ghostbtn" style={{ width: '100%', justifyContent: 'space-between' }} onClick={onConnectSourceClick}>
          <span>Or connect a source for a bigger import</span>
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
};

const LAST_MODE_KEY = 'circle:add:last-mode';

export const AddToCircleSheet = ({
  open,
  onOpenChange,
  onAdded,
  onConnectSourceClick,
}: AddToCircleSheetProps) => {
  const isMobile = useIsMobile();
  const [mode, setModeState] = useState<Mode>('image');

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try { sessionStorage.setItem(LAST_MODE_KEY, m); } catch { /* no-op */ }
  }, []);

  // First open per session: image (the most encouraging default).
  // Subsequent opens: remember the last-used mode (Apple Camera-style).
  useEffect(() => {
    if (!open) return;
    let next: Mode = 'image';
    try {
      const stored = sessionStorage.getItem(LAST_MODE_KEY);
      if (stored === 'image' || stored === 'paste' || stored === 'voice' || stored === 'typed') {
        next = stored;
      }
    } catch { /* no-op */ }
    setModeState(next);
  }, [open]);

  // Clipboard sniff: if the user has copied a LinkedIn URL / @-handle / email
  // address, surface a "Use clipboard" pill. The sheet-open is a user gesture
  // so the clipboard read is allowed on most browsers; permission denials are
  // swallowed silently.
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  useEffect(() => {
    if (!open) { setClipboardHint(null); setClipboardText(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const raw = await navigator.clipboard?.readText?.();
        if (cancelled || !raw) return;
        if (!looksLikeContact(raw)) return;
        setClipboardText(raw);
        setClipboardHint(shortPreview(raw));
      } catch { /* permission denied or unsupported - ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const [pastePrefill, setPastePrefill] = useState<string | undefined>(undefined);
  const handleUseClipboard = useCallback(() => {
    if (!clipboardText) return;
    haptics.tap();
    setPastePrefill(clipboardText);
    setMode('paste');
    setClipboardHint(null);
  }, [clipboardText, setMode]);
  const handleDismissClipboard = useCallback(() => {
    setClipboardHint(null);
    setClipboardText(null);
  }, []);

  // Don't carry the prefill into the next open.
  useEffect(() => { if (!open) setPastePrefill(undefined); }, [open]);

  const wrappedOnAdded = useCallback((result: IngestResult) => {
    const bits: string[] = [];
    if (result.circleNew) bits.push(`${result.circleNew} new`);
    if (result.circleMerged) bits.push(`${result.circleMerged} merged`);
    toast.success(bits.length ? bits.join(' · ') : 'Added to your Circle');
    onAdded?.(result);
  }, [onAdded]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const body = (
    <SheetBody
      mode={mode}
      setMode={setMode}
      onAdded={wrappedOnAdded}
      onClose={handleClose}
      onConnectSourceClick={onConnectSourceClick}
      clipboardHint={clipboardHint}
      onUseClipboard={handleUseClipboard}
      onDismissClipboard={handleDismissClipboard}
      pastePrefill={pastePrefill}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerTitle className="sr-only">Add to your circle</DrawerTitle>
          <div className="thx overflow-y-auto pb-safe-bottom" style={{ background: 'var(--thx-bg)' }}>{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Add to your circle</DialogTitle>
        <div className="thx max-h-[80vh] overflow-y-auto" style={{ background: 'var(--thx-bg)' }}>{body}</div>
      </DialogContent>
    </Dialog>
  );
};
