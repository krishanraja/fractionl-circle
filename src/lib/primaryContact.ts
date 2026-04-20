// Phase A: one-click contactability resolver.
//
// Rule: primary mode of contact = how the person was first loaded into the
// system. A person who came in via a LinkedIn CSV export should be reachable
// by a LinkedIn DM in one tap; a Google contact → email; an iOS contact →
// phone; an Instagram screenshot → IG DM. If the "primary" channel has no
// data on the row, we fall back to the next populated field.
//
// The resolver is pure: caller passes in the circle_person row + any known
// person_raw rows, gets back a primary action + list of alternates. No
// hooks, no supabase, no side-effects.

import type { LucideIcon } from 'lucide-react';
import {
  Linkedin,
  Instagram,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  Twitter,
  Music,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

export interface ContactablePerson {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
}

export interface ContactableRaw {
  source_kind: string | null;
  ingested_at: string;
  payload: Record<string, unknown> | null;
}

export type ContactChannel =
  | 'linkedin'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'copy_name';

export interface ContactAction {
  channel: ContactChannel;
  label: string;           // "Message Jenna on LinkedIn"
  short: string;           // "LinkedIn"
  icon: LucideIcon;
  value: string | null;    // URL / email / phone the action will use
}

export interface ContactActionSet {
  primary: ContactAction;
  alternates: ContactAction[];
}

// ---------------------------------------------------------------------------
// Channel priority per source kind. The first channel in each row is the
// preferred one; everything after is the fallback order if the preferred
// channel's data is missing.
// ---------------------------------------------------------------------------

const SOURCE_PRIORITY: Record<string, ContactChannel[]> = {
  linkedin_csv:         ['linkedin', 'email', 'phone'],
  linkedin_extension:   ['linkedin', 'email', 'phone'],
  google:               ['email', 'linkedin', 'phone'],
  microsoft:            ['email', 'linkedin', 'phone'],
  inbox_signature_scan: ['email', 'linkedin', 'phone'],
  calendar_backscan:    ['email', 'linkedin', 'phone'],
  ios_contacts:         ['phone', 'sms', 'email', 'whatsapp'],
  ios_shortcut:         ['phone', 'sms', 'email'],
  share_sheet:          ['instagram', 'linkedin', 'email', 'phone'], // platform-dependent; overridden below
  business_card_photo:  ['email', 'phone', 'linkedin'],
  voice_seed:           ['linkedin', 'email', 'phone'],
  external_enrichment:  ['linkedin', 'email', 'phone'],
  instagram_export:     ['instagram', 'linkedin', 'email'],
  x_export:             ['x', 'linkedin', 'email'],
  facebook_export:      ['email', 'linkedin'],
  sheet_upload:         ['email', 'linkedin', 'phone'],
  legacy_crm_csv:       ['email', 'linkedin', 'phone'],
};

const DEFAULT_PRIORITY: ContactChannel[] = ['linkedin', 'email', 'phone', 'sms', 'whatsapp', 'instagram', 'tiktok', 'x', 'copy_name'];

// ---------------------------------------------------------------------------
// Extract what we can from person + raw records.
// ---------------------------------------------------------------------------

interface ChannelData {
  linkedin: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  x: string | null;
}

function pickFromPayload(raws: ContactableRaw[], keys: string[]): string | null {
  for (const raw of raws) {
    if (!raw.payload) continue;
    for (const key of keys) {
      const v = raw.payload[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

function gatherChannels(person: ContactablePerson, raws: ContactableRaw[]): ChannelData {
  const linkedin = person.linkedin_url ?? pickFromPayload(raws, ['linkedin_url', 'profile_url']);
  // For IG/TikTok/X we look at payload.profile_url if the parser tagged the platform.
  let instagram: string | null = null;
  let tiktok: string | null = null;
  let x: string | null = null;
  for (const raw of raws) {
    if (!raw.payload) continue;
    const platform = typeof raw.payload.platform === 'string'
      ? (raw.payload.platform as string).toLowerCase()
      : null;
    const url = typeof raw.payload.profile_url === 'string' ? (raw.payload.profile_url as string) : null;
    const handle = typeof raw.payload.handle === 'string' ? (raw.payload.handle as string) : null;
    const candidate = url ?? handle;
    if (!candidate) continue;
    if (platform === 'instagram' && !instagram) instagram = candidate;
    if (platform === 'tiktok' && !tiktok) tiktok = candidate;
    if ((platform === 'x' || platform === 'twitter') && !x) x = candidate;
    // Heuristic fallback: recognize by URL substring if platform is missing.
    if (!instagram && /instagram\.com/i.test(candidate)) instagram = candidate;
    if (!tiktok && /tiktok\.com/i.test(candidate)) tiktok = candidate;
    if (!x && /(twitter\.com|x\.com)/i.test(candidate)) x = candidate;
  }
  return {
    linkedin: linkedin ?? null,
    email: person.primary_email,
    phone: person.primary_phone,
    instagram,
    tiktok,
    x,
  };
}

// ---------------------------------------------------------------------------
// Channel → ContactAction.
// ---------------------------------------------------------------------------

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

function buildAction(channel: ContactChannel, data: ChannelData, name: string): ContactAction | null {
  const who = firstName(name);
  switch (channel) {
    case 'linkedin':
      if (!data.linkedin) return null;
      return { channel, label: `Message ${who} on LinkedIn`, short: 'LinkedIn', icon: Linkedin, value: data.linkedin };
    case 'email':
      if (!data.email) return null;
      return { channel, label: `Email ${who}`, short: 'Email', icon: Mail, value: data.email };
    case 'phone':
      if (!data.phone) return null;
      return { channel, label: `Call ${who}`, short: 'Call', icon: Phone, value: data.phone };
    case 'sms':
      if (!data.phone) return null;
      return { channel, label: `Text ${who}`, short: 'SMS', icon: MessageSquare, value: data.phone };
    case 'whatsapp':
      if (!data.phone) return null;
      return { channel, label: `WhatsApp ${who}`, short: 'WhatsApp', icon: MessageSquare, value: data.phone };
    case 'instagram':
      if (!data.instagram) return null;
      return { channel, label: `DM ${who} on Instagram`, short: 'Instagram', icon: Instagram, value: data.instagram };
    case 'tiktok':
      if (!data.tiktok) return null;
      return { channel, label: `Open ${who} on TikTok`, short: 'TikTok', icon: Music, value: data.tiktok };
    case 'x':
      if (!data.x) return null;
      return { channel, label: `DM ${who} on X`, short: 'X', icon: Twitter, value: data.x };
    case 'copy_name':
      return { channel, label: `Copy ${name}'s name`, short: 'Copy name', icon: Copy, value: name };
  }
}

// ---------------------------------------------------------------------------
// Main resolver.
// ---------------------------------------------------------------------------

function pickSourcePriority(raws: ContactableRaw[]): ContactChannel[] {
  // Earliest raw record wins — that's "how they were loaded in".
  const ordered = [...raws].sort((a, b) => (a.ingested_at ?? '').localeCompare(b.ingested_at ?? ''));
  const first = ordered[0];
  const kind = first?.source_kind ?? '';

  // share_sheet is special: the specific platform lives on the payload.
  if (kind === 'share_sheet') {
    const platform = typeof first?.payload?.platform === 'string'
      ? (first.payload.platform as string).toLowerCase()
      : null;
    if (platform === 'instagram') return ['instagram', 'email', 'linkedin'];
    if (platform === 'tiktok') return ['tiktok', 'email', 'linkedin'];
    if (platform === 'x' || platform === 'twitter') return ['x', 'email', 'linkedin'];
    if (platform === 'linkedin') return ['linkedin', 'email', 'phone'];
  }

  return SOURCE_PRIORITY[kind] ?? DEFAULT_PRIORITY;
}

export function primaryContactAction(
  person: ContactablePerson,
  raws: ContactableRaw[] = [],
): ContactActionSet {
  const data = gatherChannels(person, raws);
  const priority = pickSourcePriority(raws);

  const actions: ContactAction[] = [];
  const seen = new Set<ContactChannel>();

  const appendIfViable = (channel: ContactChannel) => {
    if (seen.has(channel)) return;
    const action = buildAction(channel, data, person.display_name);
    if (!action) return;
    seen.add(channel);
    actions.push(action);
  };

  for (const ch of priority) appendIfViable(ch);
  // Backfill with any channels not already listed, so "Copy" / off-priority
  // options still show up in the dropdown.
  for (const ch of DEFAULT_PRIORITY) appendIfViable(ch);

  if (!actions.length) {
    // Nothing viable — always keep a copy-name fallback so the button is never disabled.
    const fallback = buildAction('copy_name', data, person.display_name)!;
    actions.push(fallback);
  }

  return {
    primary: actions[0],
    alternates: actions.slice(1),
  };
}
