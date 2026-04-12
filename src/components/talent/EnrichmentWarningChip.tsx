import { AlertTriangle, RefreshCw, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTalentContacts, type TalentContactWithSkills } from '@/hooks/useTalentContacts';
import { toast } from 'sonner';

interface EnrichmentWarningChipProps {
  contact: TalentContactWithSkills;
  /** Called after a successful retry so the parent can re-read the contact. */
  onResolved?: () => void;
}

/**
 * Soft-amber chip shown at the top of a contact's detail/edit view when
 * enrichment failed or the contact needs review. One line, dismissible,
 * with a one-tap retry.
 */
export function EnrichmentWarningChip({ contact, onResolved }: EnrichmentWarningChipProps) {
  const { updateContact } = useTalentContacts();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const status = contact.enrichment_status;
  const needsReview = contact.needs_review;
  const show = !dismissed && (status === 'failed' || status === 'conflict' || needsReview);
  if (!show) return null;

  const reason = contact.enrichment_failure_reason
    || (status === 'conflict' ? 'A merge conflict needs your attention'
    : needsReview ? 'This contact needs a quick review'
    : "Profile lookup didn't find a match");

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Try email first, then name-based LinkedIn search.
      let succeeded = false;

      if (contact.email) {
        const { data } = await supabase.functions.invoke('contact-enrich', {
          body: { email: contact.email },
        });
        if (data?.enriched) {
          const e = data.enriched;
          await updateContact(contact.id, {
            enrichment_status: 'succeeded',
            enrichment_failure_reason: null,
            enrichment_last_attempt_at: new Date().toISOString(),
            needs_review: false,
            // fill empty fields only
            ...(!contact.company && e.company && { company: e.company }),
            ...(!contact.title && e.title && { title: e.title }),
            ...(!contact.city && e.city && { city: e.city }),
            ...(!contact.linkedin_url && e.linkedin_url && { linkedin_url: e.linkedin_url }),
            ...(!contact.photo_url && e.photo_url && { photo_url: e.photo_url }),
          } as any);
          succeeded = true;
        }
      }

      if (!succeeded && contact.name) {
        const { data } = await supabase.functions.invoke('contact-enrich', {
          body: { name: contact.name, linkedin_search: true },
        });
        const best = data?.results?.[0];
        if (best) {
          await updateContact(contact.id, {
            enrichment_status: 'succeeded',
            enrichment_failure_reason: null,
            enrichment_last_attempt_at: new Date().toISOString(),
            needs_review: false,
            ...(!contact.company && best.company && { company: best.company }),
            ...(!contact.title && best.title && { title: best.title }),
            ...(!contact.linkedin_url && best.url && { linkedin_url: best.url }),
            ...(!contact.photo_url && best.photo_url && { photo_url: best.photo_url }),
          } as any);
          succeeded = true;
        }
      }

      if (succeeded) {
        toast.success('Found a match');
        onResolved?.();
      } else {
        await updateContact(contact.id, {
          enrichment_last_attempt_at: new Date().toISOString(),
        } as any);
        toast.error('Still no match. You can edit the fields manually below.');
      }
    } catch {
      toast.error('Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    await updateContact(contact.id, {
      needs_review: false,
      enrichment_status: status === 'failed' ? 'none' : status,
    } as any);
  };

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-xs text-foreground leading-relaxed">{reason}</p>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50"
        title="Retry enrichment"
      >
        {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        {retrying ? '' : 'Retry'}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-foreground-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
