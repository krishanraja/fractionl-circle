import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, Upload, X, Paperclip, AlertCircle } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConcierge } from '@/hooks/useConcierge';

interface ConciergeBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const Body = ({ onClose, onSubmitted }: { onClose: () => void; onSubmitted?: () => void }) => {
  const { submit, submitting } = useConcierge();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preferredTimes, setPreferredTimes] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    const next: File[] = [...files];
    for (const f of list) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is over 25 MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        toast.info(`Max ${MAX_FILES} files per request.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const handleRemove = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    try {
      await submit({ preferred_times: preferredTimes, notes, files });
      toast.success('Concierge request in. We\'ll reach out within 24 hours.');
      onSubmitted?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not submit';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="p-6 pt-3 pb-safe-bottom">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Book your concierge onboarding</h2>
        <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
          A 15-minute call, then we normalize your Circle end-to-end within 24 hours. Share whatever
          you want us to work with.
        </p>
      </header>

      <div className="space-y-5">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">
            When works?
          </label>
          <textarea
            value={preferredTimes}
            onChange={(e) => setPreferredTimes(e.target.value)}
            placeholder="e.g. Tue / Thu mornings PT, or any 15-min slot this week."
            className="mt-1 w-full min-h-[60px] rounded-xl border border-border/60 bg-background p-2 text-sm text-foreground resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">
            Anything we should know?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Who are your top 3 clients? What&apos;s your north-star ICP? Anything we should definitely not touch?"
            className="mt-1 w-full min-h-[90px] rounded-xl border border-border/60 bg-background p-2 text-sm text-foreground resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">
            Drop your existing data
          </label>
          <p className="mt-1 text-xs text-foreground-muted">
            LinkedIn export, old CRM CSVs, Google Sheets, anything else. Up to {MAX_FILES} files, 25 MB each.
          </p>
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 w-full rounded-2xl border-2 border-dashed border-border/60 bg-card/40 py-6 flex flex-col items-center justify-center gap-1 hover:border-primary/40 transition-colors"
          >
            <Upload className="w-5 h-5 text-foreground-secondary" />
            <p className="text-sm font-medium text-foreground">Drop files here</p>
            <p className="text-xs text-foreground-muted">or tap to pick</p>
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 backdrop-blur px-3 py-2"
                >
                  <Paperclip className="w-3.5 h-3.5 text-foreground-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                    <p className="text-[10px] text-foreground-muted">{formatBytes(f.size)}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(f.name)}
                    className="text-foreground-muted hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-11 px-5 rounded-full border border-border/60 bg-card/60 text-sm font-medium text-foreground-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              'flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
              'inline-flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20',
              'disabled:opacity-70'
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? 'Sending…' : 'Send it'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConciergeBookingSheet = ({ open, onOpenChange, onSubmitted }: ConciergeBookingSheetProps) => {
  const isMobile = useIsMobile();
  const body = <Body onClose={() => onOpenChange(false)} onSubmitted={onSubmitted} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
