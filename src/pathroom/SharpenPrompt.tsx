// The proactive Socratic coach, droppable on any surface. Shows the single
// highest-leverage question to sharpen the thesis, framed as a DECISION (tap an
// option) so the user decides rather than stares at a blank box. Calm and never
// pushy: one question at a time, skippable, dismissible. Answering banks a
// decision that raises the strength score on the next read.
import { useEffect, useState } from 'react';
import { getNextQuestion, saveThesisAnswer, type NextQuestion } from './thesisData';

export default function SharpenPrompt({ onAnswered, dimensionHint }: {
  onAnswered?: () => void;
  dimensionHint?: string; // optional: prefer a question on this dimension's topic
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

  if (dismissed) return null;
  if (loading) return null; // stay quiet until there's something to ask
  if (!q) {
    if (streak === 0) return null;
    return (
      <div className="spk spk-done">
        <span className="spk-doneicon">✓</span>
        <span>Sharp for now — {streak} decision{streak === 1 ? '' : 's'} banked. Re-run your read to lock the gains in.</span>
      </div>
    );
  }

  return (
    <div className="spk">
      <div className="spk-head">
        <span className="spk-tag">Sharpen · {q.dimension}</span>
        <span className="spk-ctrls">
          <button className="spk-icon" title="Another question" disabled={busy} onClick={() => void load()}>↻</button>
          <button className="spk-icon" title="Dismiss" onClick={() => setDismissed(true)}>×</button>
        </span>
      </div>
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
  );
}
