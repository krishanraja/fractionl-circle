import { useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { useTalentContacts, type TalentContactWithSkills } from './useTalentContacts';
import {
  useDuplicateDetection,
  type DuplicateMatch,
  type DuplicateInput,
  extractInstagramHandle,
  extractLinkedInSlug,
} from './useDuplicateDetection';

type TalentContactInsert = Database['public']['Tables']['talent_contacts']['Insert'];

export interface IntakeOptions {
  /** Skills to attach on create. */
  skillIds?: string[];
  /**
   * What to do when we find possible duplicates.
   * - `'prompt'` (default): return `{ status: 'duplicates', matches }` without writing; caller shows UI.
   * - `'auto_merge'`: only auto-merge when the top match has confidence >= `autoMergeThreshold`;
   *    otherwise return `duplicates` for caller to handle.
   * - `'save_new'`: ignore dedup entirely (use only for the explicit "Save as new" user action).
   */
  onDuplicate?: 'prompt' | 'auto_merge' | 'save_new';
  /** Minimum match confidence to auto-merge without prompting. Default 1.0 (strong identity only). */
  autoMergeThreshold?: number;
  /**
   * If enrichment was attempted and failed/partial, pass a reason to flag the contact.
   * The contact is still saved; a warning appears in the UI.
   */
  enrichmentStatus?: 'succeeded' | 'failed' | 'none';
  enrichmentFailureReason?: string;
  /** Mark needs_review = true (e.g. name fell back to a raw slug). */
  needsReview?: boolean;
}

export type IntakeResult =
  | { status: 'created'; contact: any }
  | { status: 'merged'; contact: TalentContactWithSkills; fieldsFilled: string[] }
  | { status: 'duplicates'; matches: DuplicateMatch[] }
  | { status: 'error'; error: string };

/** Fields we auto-fill on merge when they're empty on the existing contact. */
const MERGEABLE_FIELDS = [
  'email', 'phone', 'linkedin_url', 'portfolio_url', 'photo_url',
  'specialty_summary', 'company', 'title', 'city', 'met_at', 'met_date',
  'notes_voice_raw',
] as const;

/** Normalize an incoming contact payload so findDuplicates can read every identifier. */
function toDuplicateInput(contact: TalentContactInsert): DuplicateInput {
  return {
    name: contact.name,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    linkedin_url: contact.linkedin_url ?? undefined,
    portfolio_url: contact.portfolio_url ?? undefined,
  };
}

/**
 * Shared contact intake flow used by every entry point (QuickAdd, Voice, Photo,
 * LinkedIn URL, Instagram, Phone Contacts, CSV, Screenshot).
 *
 * Guarantees:
 * 1. Dedup runs on every save — LinkedIn slug, email, phone, Instagram, fuzzy name.
 * 2. Enrichment failures never block the save; they flag the contact.
 * 3. Merge semantics are consistent: fill-empty-fields for non-conflicting fields.
 */
export function useContactIntake() {
  const { contacts, createContact, updateContact } = useTalentContacts();
  const { findDuplicates } = useDuplicateDetection(contacts);

  const intake = useCallback(async (
    contact: TalentContactInsert,
    options: IntakeOptions = {}
  ): Promise<IntakeResult> => {
    const {
      skillIds = [],
      onDuplicate = 'prompt',
      autoMergeThreshold = 1.0,
      enrichmentStatus,
      enrichmentFailureReason,
      needsReview,
    } = options;

    // Tack on the enrichment flags so the UI can resurface failures.
    const flagged: TalentContactInsert = {
      ...contact,
      ...(enrichmentStatus !== undefined && { enrichment_status: enrichmentStatus }),
      ...(enrichmentStatus !== undefined && { enrichment_last_attempt_at: new Date().toISOString() }),
      ...(enrichmentFailureReason !== undefined && { enrichment_failure_reason: enrichmentFailureReason }),
      ...(needsReview !== undefined && { needs_review: needsReview }),
    };

    if (onDuplicate !== 'save_new') {
      const matches = findDuplicates(toDuplicateInput(flagged));

      if (matches.length > 0) {
        const top = matches[0];
        const shouldAutoMerge =
          onDuplicate === 'auto_merge' && top.confidence >= autoMergeThreshold;

        if (shouldAutoMerge) {
          return await mergeInto(top.contact, flagged);
        }

        return { status: 'duplicates', matches };
      }
    }

    try {
      const newContact = await createContact(flagged, skillIds);
      return { status: 'created', contact: newContact };
    } catch (err: any) {
      return { status: 'error', error: err?.message ?? 'Failed to create contact' };
    }
  }, [contacts, findDuplicates, createContact]);

  /** Merge `incoming` into `existing`, only filling empty fields. */
  const mergeInto = useCallback(async (
    existing: TalentContactWithSkills,
    incoming: TalentContactInsert
  ): Promise<IntakeResult> => {
    const updates: Record<string, any> = {};
    const fieldsFilled: string[] = [];

    for (const field of MERGEABLE_FIELDS) {
      const existingValue = (existing as any)[field];
      const incomingValue = (incoming as any)[field];
      if (!existingValue && incomingValue) {
        updates[field] = incomingValue;
        fieldsFilled.push(field);
      }
    }

    // Propagate enrichment status if the new signal is stronger.
    if (incoming.enrichment_status === 'succeeded' && existing.enrichment_status !== 'succeeded') {
      updates.enrichment_status = 'succeeded';
      updates.enrichment_failure_reason = null;
    }

    try {
      if (Object.keys(updates).length > 0) {
        await updateContact(existing.id, updates as any);
      }
      return { status: 'merged', contact: existing, fieldsFilled };
    } catch (err: any) {
      return { status: 'error', error: err?.message ?? 'Failed to merge contact' };
    }
  }, [updateContact]);

  return { intake, mergeInto, findDuplicates };
}

// Re-export for convenience
export { extractLinkedInSlug, extractInstagramHandle };
