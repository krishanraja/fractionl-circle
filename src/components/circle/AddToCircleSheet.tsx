import { useCallback, useEffect, useState } from 'react';
import { Camera, Clipboard, Mic, Type, ChevronRight, Sparkles, X } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

const shortPreview = (raw: string): string => {
  const t = raw.trim().split('\n')[0];
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
};

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
    <div className="p-6 pt-3 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Add to your Circle</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Drop whatever you've got — name, screenshot, link, voice memo. The faster, the better.
        </p>
      </div>

      {clipboardHint && (
        <button
          onClick={onUseClipboard}
          className={cn(
            'w-full flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5',
            'px-3 h-11 text-left text-sm text-foreground hover:bg-primary/10 transition-colors'
          )}
        >
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0 truncate">
            Use clipboard — <span className="text-foreground-secondary">{clipboardHint}</span>
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Dismiss clipboard hint"
            onClick={(e) => { e.stopPropagation(); onDismissClipboard(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDismissClipboard(); } }}
            className="shrink-0 w-7 h-7 -mr-1 rounded-full inline-flex items-center justify-center text-foreground-muted hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      <div role="radiogroup" aria-label="Choose add method" className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (!active) haptics.tap();
                setMode(m.id);
              }}
              className={cn(
                'h-auto py-3 px-3 rounded-xl border text-left transition-colors',
                'flex items-start gap-2.5',
                active
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border/60 bg-card/40 hover:border-primary/40'
              )}
            >
              <div className={cn(
                'mt-0.5 rounded-full p-1.5 shrink-0',
                active ? 'bg-primary/15' : 'bg-primary/10'
              )}>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{m.label}</p>
                <p className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                  {m.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {mode === 'image' && <QuickAddImage onDone={onAdded} onClose={onClose} />}
        {mode === 'paste' && <QuickAddPaste onDone={onAdded} onClose={onClose} prefill={pastePrefill} />}
        {mode === 'voice' && <VoiceSeedCapture onDone={onAdded} onClose={onClose} />}
        {mode === 'typed' && <QuickAddTyped onDone={onAdded} onClose={onClose} />}
      </div>

      {onConnectSourceClick && (
        <button
          onClick={onConnectSourceClick}
          className={cn(
            'w-full mt-2 flex items-center justify-between px-3 py-2.5',
            'text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors'
          )}
        >
          <span>Or connect a source for a bigger import</span>
          <ChevronRight className="w-3.5 h-3.5" />
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
      } catch { /* permission denied or unsupported — ignore */ }
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
          <div className="overflow-y-auto pb-safe-bottom">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="max-h-[80vh] overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
