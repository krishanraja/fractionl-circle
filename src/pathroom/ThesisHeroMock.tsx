// Fixture demo of the thesis hero at /thesis-preview: the same shared views as the live
// app (/thesis), driven by fixtures, with a phase nav so every screen is reviewable on
// any device without auth or data. The design reference; the live product is ThesisApp.
import { useEffect, useRef, useState } from 'react';
import { thesisCss, CaptureView, ThinkingView, ReadView, StepsView, type Scorecard } from './thesisViews';

const PHASES: Array<[string, string]> = [['capture', 'Capture'], ['thinking', 'Watch it think'], ['read', 'The read'], ['steps', 'The steps']];

const FIXTURE: Scorecard = {
  read: 'Strong idea. Crowded lane. Yours to win.',
  from: 'Ex-CMO, two exits, no fractional clients yet.',
  to: 'Two to three retained seed-stage clients at $6K to $8K a month.',
  opportunity: [
    { label: 'Demand', band: 'strong', evidence: 'Founders increasingly buy outcomes over headcount.', confidence: 'high' },
    { label: 'Burning need', band: 'mixed', evidence: 'They pay to avoid a premature full-time hire, but seed budgets are tight.', confidence: 'medium' },
    { label: 'Crowding', band: 'risk', evidence: '~110,000 fractional profiles. The generalist middle is saturated.', confidence: 'high' },
    { label: 'Your edge', band: 'strong', evidence: 'Seed-stage focus plus two exits is a defensible niche.', confidence: 'high' },
  ],
  ability: [
    { label: 'Fit to you', band: 'strong', evidence: 'Operator background, and you have sold before.', confidence: 'high' },
    { label: 'Warm reach', band: 'strong', evidence: 'Nine seed-stage founders already in your network.', confidence: 'high' },
    { label: 'Credibility', band: 'mixed', evidence: 'Two exits prove value fast; the category still needs explaining.', confidence: 'medium' },
  ],
  flags: [
    'Plan for a 12 to 24 month income ramp while the pipeline builds.',
    'Name the scope tightly. Strategy-only offers invite scope creep.',
    'A seed-stage onboarding playbook would productize this beyond hourly.',
    'Comparable retainers land around $6K to $8K per month.',
  ],
  steps: [
    { title: 'Sharpen your wedge to one sentence.', why: 'In a lane this crowded, the specific wins and the generalist gets skipped. Lead with seed-stage and your two exits, nothing softer.', tag: 'this week' },
    { title: 'Turn your two exits into two short proof stories.', why: 'Seed founders buy proof fast. Your track record is the quickest trust you have, so make it impossible to miss.' },
    { title: 'Package one fixed-scope offer, priced.', why: 'A fixed first-90-days scope closes faster than hourly and shields you from scope creep. Sit it around $6K to $8K a month.' },
    { title: 'Reach the nine founders already in your circle.', why: 'Almost every fractional client comes through a warm relationship, not cold outreach. This is the single move that lands your first client fastest.', touches: '9 people', big: true },
    { title: 'Ask every warm chat for one introduction.', why: 'Referrals compound. One good intro becomes your second client, and the portfolio starts to build itself.' },
  ],
  journey: [
    { label: 'Reading your background', finding: '12 years in B2B SaaS marketing, two exits.', source: 'LinkedIn' },
    { label: 'Sizing demand against supply', finding: 'Real, growing demand from seed-stage founders, but ~110,000 fractional profiles now compete.', source: 'Perplexity' },
    { label: 'Scanning where your buyers complain', finding: '"Hired a CMO too senior, too early." "I need strategy, not a full-timer." Recurring in r/SaaS and founder LinkedIn.', source: 'Reddit · LinkedIn' },
    { label: 'Checking who else offers this', finding: 'Dozens of generalist fractional CMOs. Very few own seed-stage specifically.', source: 'Perplexity' },
    { label: 'Mapping your network to the buyers', finding: 'Nine seed-stage founders already sit in your first-degree network.', source: 'Your network' },
    { label: 'Confirming willingness to pay at seed stage', finding: 'Could not strongly confirm seed-stage budgets. Treating this as medium confidence.', source: 'low confidence', low: true },
  ],
};

export default function ThesisHeroMock() {
  const [phase, setPhase] = useState('capture');
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (phase !== 'thinking') { setShown(phase === 'read' || phase === 'steps' ? FIXTURE.journey.length : 0); return; }
    setShown(0);
    FIXTURE.journey.forEach((_, i) => timers.current.push(window.setTimeout(() => setShown(i + 1), 700 * (i + 1))));
    return () => timers.current.forEach(clearTimeout);
  }, [phase]);

  return (
    <div className="thx"><style>{thesisCss}</style>
      <div className="wrap">
        <div className="nav">
          {PHASES.map(([k, l]) => <button key={k} className={'nb' + (phase === k ? ' on' : '')} onClick={() => setPhase(k)}>{l}</button>)}
        </div>
        {phase === 'capture' ? <CaptureView onSubmit={() => setPhase('thinking')} /> : null}
        {phase === 'thinking' ? <ThinkingView steps={FIXTURE.journey} shown={shown} done={shown >= FIXTURE.journey.length} onSeeRead={() => setPhase('read')} /> : null}
        {phase === 'read' ? <ReadView data={FIXTURE} onSteps={() => setPhase('steps')} /> : null}
        {phase === 'steps' ? <StepsView data={FIXTURE} onStart={() => setPhase('capture')} /> : null}
      </div>
    </div>
  );
}
