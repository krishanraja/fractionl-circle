// The proactive Socratic coach, droppable on any surface. Shows the single
// highest-leverage question to sharpen the thesis, framed as a DECISION (tap an
// option) so the user decides rather than stares at a blank box. Calm and never
// pushy: one question at a time, skippable, dismissible. Answering banks a
// decision that raises the strength score on the next read.
//
// Two registers:
//  - inline (default): quiet — renders nothing until there's something to ask,
//    so it never intrudes on the read / journey screens.
//  - focus (the "Make it stronger" screen, where the question is the centrepiece):
//    it OWNS a stable slot. It shows a skeleton of the same height while the AI
//    thinks and a calm resting state when there's nothing to ask, so the content
//    below it (the quick-input rows) never gets shoved around as things load.
import { useEffect, useState } from 'react';
import { getNextQuestion, saveThesisAnswer, type NextQuestion } from './thesisData';

export default function SharpenPrompt({ onAnswered, dimensionHint, focus = false }: {
  onAnswered?: () => void;
  dimensionHint?: string; // optional: prefer a question on this dimension's topic
  focus?: boolean; // occupy a stable slot (skeleton + resting state) instead of staying quiet
}) {
  const [q, setQ] = useState<NextQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [streak, setStreak] = useState(0);

  async function load() {
    setLoading(true);
    const next = await getNextQuestion();
    setQ(next);
    setLoading(false);
    setTyping(false);
    setText('');
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function answer(value: string) {
    if (!q || busy || !value.trim()) return;
    setBusy(true);
    try {
      await saveThesisAnswer({ run_id: q.run_id, dimension: q.dimension, topic: q.topic, question: q.question, answer: value.trim() });
      setStreak((s) => s + 1);
      onAnswered?.();
      await load();
    } finally {
      setBusy(false);
    }
  }

  const shellClass = 'spk' + (focus ? ' spk-focus' : '');

  // Loading. On the focus surface we hold the slot with a skeleton of the same
  // shape/height so nothing below reflows when the question lands. Inline, we
  // stay quiet.
  if (loading) {
    if (!focus) return null;
    return (
      <div className={shellClass} aria-busy="true">
        <div className="spk-head"><span className="spk-tag">Make stronger</span></div>
        <div className="spk-skel spk-skel-q" />
        <div className="spk-skel spk-skel-q short" />
        <div className="spk-opts" style={{ marginTop: 14 }}>
          <div className="spk-skel spk-skel-opt" />
          <div className="spk-skel spk-skel-opt" />
          <div className="spk-skel spk-skel-opt" />
        </div>
        <div className="spk-skelnote">Finding your highest-leverage question…</div>
      </div>
    );
  }

  // Nothing to ask. Inline stays quiet (or shows the banked-streak note); the
  // focus surface holds the slot with a calm resting state so the layout is stable.
  if (dismissed || !q) {
    if (dismissed && !focus) return null;
    if (!q && !focus) {
      if (streak === 0) return null;
      return (
        <div className="spk spk-done">
          <span className="spk-doneicon">✓</span>
          <span>Sharp for now — {streak} decision{streak === 1 ? '' : 's'} banked. See how it lands again to lock the gains in.</span>
        </div>
      );
    }
    // focus resting state
    return (
      <div className={shellClass + ' spk-rest'}>
        <span className="spk-doneicon">✓</span>
        <span>
          {streak > 0
            ? `Sharp for now — ${streak} decision${streak === 1 ? '' : 's'} banked. See how it lands again to lock the gains in.`
            : "You're sharp here for now. Add a bit more signal below, then see how it lands."}
        </span>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="spk-head">
        <span className="spk-tag">Make stronger · {q.dimension}</span>
        <span className="spk-ctrls">
          <button className="spk-icon" title="Another question" disabled={busy} onClick={() => void load()}>↻</button>
          {/* On the focus screen the question is the centrepiece and you leave via
              the header back control, so the confusing per-card dismiss is hidden. */}
          {!focus ? <button className="spk-icon" title="Dismiss" onClick={() => setDismissed(true)}>×</button> : null}
        </span>
      </div>
      {/* Keyed on the question so each new/refreshed question fades into the
          reserved slot instead of snapping. */}
      <div key={q.question} className="spk-body">
        <div className="spk-q">{q.question}</div>
        {q.why ? <div className="spk-why">{q.why}</div> : null}
        {!typing ? (
          <>
            <div className="spk-opts">
              {q.options.map((o, i) => (
                <button key={i} className="spk-opt" disabled={busy} onClick={() => answer(o)}>{o}</button>
              ))}
            </div>
            <button className="spk-skip" disabled={busy} onClick={() => setTyping(true)}>or say it in your words</button>
          </>
        ) : (
          <div className="spk-typed">
            <input
              className="spk-input"
              value={text}
              autoFocus
              placeholder="Your answer…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void answer(text); }}
            />
            <button className="spk-send" disabled={busy || !text.trim()} onClick={() => void answer(text)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}
