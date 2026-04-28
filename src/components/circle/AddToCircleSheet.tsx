import { useEffect, useState } from 'react';
import { Camera, Clipboard, Mic, Type, ChevronRight } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickAddImage } from './QuickAddImage';
import { QuickAddPaste } from './QuickAddPaste';
import { QuickAddTyped } from './QuickAddTyped';
import { VoiceSeedCapture } from './VoiceSeedCapture';
import type { IngestResult } from '@/lib/circleIngest';
import { cn } from '@/lib/utils';

type Mode = 'image' | 'paste' | 'voice' | 'typed';

const MODES: { id: Mode; label: string; hint: string; icon: typeof Camera }[] = [
  { id: 'image', label: 'Screenshot or photo', hint: 'LinkedIn, business card, name tag', icon: Camera },
  { id: 'paste', label: 'Paste anything', hint: 'URL, handle, signature, bio', icon: Clipboard },
  { id: 'voice', label: 'Just say their name', hint: 'Hold to talk', icon: Mic },
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
  onConnectSourceClick,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onAdded?: (result: IngestResult) => void;
  onConnectSourceClick?: () => void;
}) => {
  return (
    <div className="p-6 pt-3 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Add to your Circle</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Drop whatever you've got — name, screenshot, link, voice memo. The faster, the better.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
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
        {mode === 'image' && <QuickAddImage onDone={onAdded} />}
        {mode === 'paste' && <QuickAddPaste onDone={onAdded} />}
        {mode === 'voice' && <VoiceSeedCapture onDone={onAdded} />}
        {mode === 'typed' && <QuickAddTyped onDone={onAdded} />}
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

export const AddToCircleSheet = ({
  open,
  onOpenChange,
  onAdded,
  onConnectSourceClick,
}: AddToCircleSheetProps) => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('image');

  // Reset to the default capture mode each time the sheet reopens — keeps the
  // most encouraging path ("snap a photo") as the first thing users see.
  useEffect(() => {
    if (open) setMode('image');
  }, [open]);

  const body = (
    <SheetBody
      mode={mode}
      setMode={setMode}
      onAdded={onAdded}
      onConnectSourceClick={onConnectSourceClick}
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
