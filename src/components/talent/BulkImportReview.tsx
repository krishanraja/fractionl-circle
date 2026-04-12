import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, GitMerge, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { useContactIntake } from '@/hooks/useContactIntake';
import type { DuplicateMatch } from '@/hooks/useDuplicateDetection';
import { haptics } from '@/utils/haptics';

type TalentContactInsert = Database['public']['Tables']['talent_contacts']['Insert'];

export interface BulkImportRow {
  insert: TalentContactInsert;
  matches: DuplicateMatch[];
}

interface BulkImportReviewProps {
  rows: BulkImportRow[];
  onComplete: (addedCount: number) => void;
}

type Decision = 'merge' | 'save_new' | 'skip';

/**
 * Review queue for ambiguous duplicates surfaced during bulk import.
 * Clear matches auto-merge; this UI handles the leftovers.
 */
export function BulkImportReview({ rows, onComplete }: BulkImportReviewProps) {
  const { intake, mergeInto } = useContactIntake();
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [isApplying, setIsApplying] = useState(false);

  const matchLabel = (m: DuplicateMatch) => {
    switch (m.matchType) {
      case 'email': return 'same email';
      case 'phone': return 'same phone';
      case 'linkedin': return 'same LinkedIn';
      case 'instagram': return 'same Instagram';
      case 'name': return 'similar name';
    }
  };

  const setDecision = (idx: number, decision: Decision) => {
    setDecisions(prev => ({ ...prev, [idx]: decision }));
    haptics.tap();
  };

  const handleApply = async () => {
    setIsApplying(true);
    let added = 0;

    for (let i = 0; i < rows.length; i++) {
      const decision = decisions[i] ?? 'skip';
      const row = rows[i];

      if (decision === 'skip') continue;

      if (decision === 'merge') {
        const top = row.matches[0];
        if (top) {
          const result = await mergeInto(top.contact, row.insert);
          if (result.status === 'merged') added++;
        }
      } else if (decision === 'save_new') {
        const result = await intake(row.insert, { onDuplicate: 'save_new' });
        if (result.status === 'created') added++;
      }
    }

    haptics.success();
    onComplete(added);
  };

  const undecidedCount = rows.filter((_, i) => !decisions[i]).length;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Review {rows.length} possible duplicate{rows.length !== 1 ? 's' : ''}</h3>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Merge into the existing contact, save as a new one, or skip.
        </p>
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto -mx-2 px-2">
        {rows.map((row, i) => {
          const decision = decisions[i];
          const top = row.matches[0];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-3 rounded-xl bg-secondary/40 border border-border"
            >
              {/* New contact */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate flex-1">
                  {row.insert.name}
                </p>
                <span className="text-[10px] text-foreground-muted">New</span>
              </div>

              {/* Existing match */}
              {top && (
                <div className="flex items-center gap-2 mb-3 pl-4 border-l-2 border-amber-500/40">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-sm text-foreground-secondary truncate flex-1">
                    {top.contact.name}
                  </p>
                  <span className="text-[10px] text-amber-600 font-medium">
                    {matchLabel(top)}
                  </span>
                </div>
              )}

              {/* Decision buttons */}
              <div className="flex gap-1.5">
                <DecisionButton
                  active={decision === 'merge'}
                  onClick={() => setDecision(i, 'merge')}
                  icon={<GitMerge className="w-3.5 h-3.5" />}
                  label="Merge"
                  color="amber"
                />
                <DecisionButton
                  active={decision === 'save_new'}
                  onClick={() => setDecision(i, 'save_new')}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  label="Save New"
                  color="primary"
                />
                <DecisionButton
                  active={decision === 'skip'}
                  onClick={() => setDecision(i, 'skip')}
                  icon={<X className="w-3.5 h-3.5" />}
                  label="Skip"
                  color="muted"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => onComplete(0)}
          className="flex-1"
          disabled={isApplying}
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          className="flex-1"
          disabled={isApplying || undecidedCount === rows.length}
        >
          {isApplying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Apply {rows.length - undecidedCount}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function DecisionButton({
  active, onClick, icon, label, color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'amber' | 'primary' | 'muted';
}) {
  const colorClasses = {
    amber: active ? 'bg-amber-500/15 border-amber-500/40 text-amber-700' : 'bg-transparent border-border text-foreground-secondary',
    primary: active ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-transparent border-border text-foreground-secondary',
    muted: active ? 'bg-foreground-muted/15 border-foreground-muted/40 text-foreground-muted' : 'bg-transparent border-border text-foreground-secondary',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors',
        colorClasses[color]
      )}
    >
      {icon}
      {label}
    </button>
  );
}
