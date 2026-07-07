// Client-side sufficiency judge. The live path is the judge-thesis edge function (Gemini);
// this deterministic version is the fallback so a thin/strong/question/multiple/essay
// verdict is always available even if the model call fails. Same shape both ways, so the
// dialogue does not care which answered. Logic mirrors the verified preview heuristic.

export type JudgeKind = 'strong' | 'thin' | 'question' | 'multiple' | 'essay';
export interface Verdict { kind: JudgeKind; followup: string; distilled: string; options: string[] }

const ROLE_WORDS = ['cmo', 'cfo', 'coo', 'cto', 'cpo', 'chief', 'fractional', 'head of', 'vp ', 'marketing', 'finance', 'operations', 'product', 'growth', 'sales', 'design', 'people ', 'revenue', 'brand', 'content', 'data', 'rev ops', 'revops', 'coach', 'advisor'];
const MULTIPLE_ROLES = ['cmo', 'cfo', 'coo', 'cto', 'cpo', 'cro', 'cgo', 'chief ', 'fractional ', 'head of', 'vp of', 'vp ', 'interim '];
const AUDIENCE_WORDS = ['founder', 'startup', 'start-up', 'b2b', 'b2c', 'saas', 'seed', 'series', 'pre-seed', 'dtc', 'd2c', 'ecommerce', 'e-commerce', 'smb', 'enterprise', 'agency', 'agencies', 'scaleup', 'scale-up', 'fintech', 'healthtech', 'climate', 'marketplace', 'company', 'companies', 'team', 'teams'];

function distil(t: string): string {
  // The user's own first sentence, in full - it wraps where it's shown, never cut
  // with an ellipsis.
  return t.split(/[.\n]/)[0].trim();
}

const THIN_1 = 'That is the what, but not the who, or why you. Who is it for, and what makes you the one they pick? For example: "Fractional CMO for seed B2B SaaS founders who hired too senior too early."';
const THIN_2 = 'Closer. Still need a real buyer. "Startups" could be anyone. Which ones, at what stage, with what problem?';
const QUESTION_FOLLOWUP = 'Let us find it. What have you spent the most years actually doing? Plain words, no title needed.';
const MULTI_FOLLOWUP = 'You have got a few in there. Which one do you want to pressure-test first? You can run the others after.';
const ESSAY_FOLLOWUP = 'Let me play that back. Tell me if I have got the core of it.';

export function judgeLocal(raw0: string, round = 0): Verdict {
  const raw = raw0.trim();
  const s = raw.toLowerCase();
  if (/\?\s*$/.test(raw) || /^(what should|what could|i (don'?t|do not) know|not sure|help me|no idea|i'?m not sure|where do i)/.test(s)) {
    return { kind: 'question', followup: QUESTION_FOLLOWUP, distilled: '', options: [] };
  }
  if (raw.length > 260) return { kind: 'essay', followup: ESSAY_FOLLOWUP, distilled: distil(raw), options: [] };
  const segs = raw.split(/,| and | & | or |\/| plus | as well as /i).map((x) => x.trim()).filter((x) => x.length > 2);
  const roleSegs = segs.filter((seg) => { const ls = seg.toLowerCase(); return MULTIPLE_ROLES.some((w) => ls.includes(w)); });
  if (roleSegs.length >= 2) return { kind: 'multiple', followup: MULTI_FOLLOWUP, distilled: '', options: roleSegs.slice(0, 4) };
  const roleHits = ROLE_WORDS.filter((w) => s.includes(w));
  const hasWhat = roleHits.length >= 1 || /(service|consult|advisor|coach|help|support|strateg|lead|manage)/.test(s);
  const audienceHits = AUDIENCE_WORDS.filter((w) => s.includes(w)).length;
  const hasWho = audienceHits >= 1;
  const wedge = /(who (hired|need|are|have|can'?t|cannot|struggle|want|keep)|instead of|not a full|rather than|because|so they|too (senior|early|expensive|big|small)|without|but can'?t afford|pre-revenue|post-raise|just raised|stuck (at|between)|between \$)/.test(s);
  const wordy = raw.split(/\s+/).length >= 10;
  const specificWho = audienceHits >= 2;
  if (hasWhat && hasWho && (wedge || specificWho || wordy)) return { kind: 'strong', followup: '', distilled: raw, options: [] };
  return { kind: 'thin', followup: round >= 1 ? THIN_2 : THIN_1, distilled: '', options: [] };
}
