import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "../hooks";

type Line =
  | { kind: "cmd"; text: string }
  | { kind: "out"; text: string; tone?: "ok" | "dim" }
  | { kind: "progress"; label: string; suffix: string; p?: number };

const BAR = 22;

const EPOCHS: [number, number][] = [
  [0.912, 0.61],
  [0.534, 0.78],
  [0.288, 0.88],
  [0.141, 0.94],
  [0.072, 0.97],
];

const SCRIPT: Line[] = [
  { kind: "cmd", text: "python train.py --model bilal-net --epochs 5" },
  { kind: "out", text: "loading data: 6 roles · 25 repos · 5 certifications", tone: "dim" },
  { kind: "out", text: "model: Transformer(skills=40, curiosity=inf)", tone: "dim" },
  ...EPOCHS.map(([loss, acc], i): Line => ({
    kind: "progress",
    label: `epoch ${i + 1}/5`,
    suffix: `loss ${loss.toFixed(3)} · acc ${acc.toFixed(2)}`,
  })),
  { kind: "out", text: "✓ converged — saved to ./hire_me.pt", tone: "ok" },
  { kind: "cmd", text: 'python predict.py --role "AI/ML Engineer"' },
  { kind: "out", text: "match: 0.97 · status: ready_to_join", tone: "ok" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function renderLine(l: Line, key: number | string) {
  if (l.kind === "cmd")
    return (
      <div key={key} className="t-line">
        <span className="t-prompt">$</span> {l.text}
      </div>
    );
  if (l.kind === "out")
    return (
      <div key={key} className={`t-line t-${l.tone ?? "out"}`}>
        {l.text}
      </div>
    );
  const p = l.p ?? BAR;
  return (
    <div key={key} className="t-line">
      <span className="t-dim">{l.label}</span> <span className="t-bar">{"━".repeat(p)}</span>
      <span className="t-track">{"━".repeat(BAR - p)}</span> {p === BAR && <span className="t-dim">{l.suffix}</span>}
    </div>
  );
}

/** Terminal that "trains" a model on my profile, line by line. */
export default function TrainingTerminal() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.35 });
  const [done, setDone] = useState<Line[]>(reduced ? SCRIPT : []);
  const [current, setCurrent] = useState<Line | null>(null);
  const [finished, setFinished] = useState(reduced);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    let cancelled = false;
    (async () => {
      setDone([]);
      setFinished(false);
      for (const line of SCRIPT) {
        if (line.kind === "cmd") {
          for (let i = 1; i <= line.text.length; i++) {
            if (cancelled) return;
            setCurrent({ ...line, text: line.text.slice(0, i) });
            await sleep(26);
          }
          await sleep(300);
        } else if (line.kind === "progress") {
          for (let p = 0; p <= BAR; p++) {
            if (cancelled) return;
            setCurrent({ ...line, p });
            await sleep(22);
          }
        } else {
          await sleep(260);
        }
        if (cancelled) return;
        setCurrent(null);
        setDone((d) => [...d, line]);
      }
      setFinished(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [inView, reduced, run]);

  return (
    <div className="terminal" ref={ref}>
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>~/bilal — zsh</span>
        {finished && !reduced && (
          <button className="chip-btn" onClick={() => setRun((r) => r + 1)}>
            ↻ replay
          </button>
        )}
      </div>
      <pre className="mono term-body" aria-label="Animated terminal showing a model training on my profile">
        {done.map((l, i) => renderLine(l, i))}
        {current && renderLine(current, "cur")}
        {!current && (
          <div className="t-line">
            <span className="t-prompt">$</span> <span className="caret">▍</span>
          </div>
        )}
      </pre>
    </div>
  );
}
