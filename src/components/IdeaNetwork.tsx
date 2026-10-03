import { useMemo, useState } from "react";

/*
 * A small feed-forward network you can poke. Pick interest areas as inputs,
 * watch a forward pass ripple through the layers, and read the top "ideas"
 * off the softmax output. Hidden weights are random-but-seeded (it's a
 * visualisation); output scores come from cosine similarity to idea vectors.
 */

const INPUTS = ["Vision", "Language", "Agents", "Mobile", "Data"] as const;

const IDEAS: { name: string; v: number[] }[] = [
  { name: "Assistive vision app for the visually impaired", v: [1, 0, 0, 1, 0] },
  { name: "Multimodal document-understanding agent", v: [1, 1, 1, 0, 0] },
  { name: "On-device OCR + translation", v: [1, 1, 0, 1, 0] },
  { name: "Autonomous CRM agent on Agentforce", v: [0, 0.5, 1, 0, 1] },
  { name: "RLHF-tuned tutoring chatbot", v: [0, 1, 1, 0, 0.5] },
  { name: "Predictive analytics dashboard", v: [0, 0, 0, 0, 1] },
  { name: "Voice-first Android assistant", v: [0, 1, 0.5, 1, 0] },
];

const LAYERS = [INPUTS.length, 6, 6, IDEAS.length];
const W = 560;
const H = 320;
const PAD_X = 40;
const PAD_Y = 26;

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const rand = seeded(2026);
const WEIGHTS = LAYERS.slice(1).map((n, l) =>
  Array.from({ length: n }, () => Array.from({ length: LAYERS[l] }, () => rand() * 2 - 1))
);

const layerX = (l: number) => PAD_X + (l * (W - PAD_X * 2)) / (LAYERS.length - 1);
const nodeY = (l: number, i: number) => {
  const n = LAYERS[l];
  const gap = (H - PAD_Y * 2) / Math.max(LAYERS[3], LAYERS[0]);
  return H / 2 + (i - (n - 1) / 2) * gap;
};

function forward(x: number[]) {
  const acts: number[][] = [x];
  for (let l = 0; l < 2; l++) {
    const prev = acts[l];
    const raw = WEIGHTS[l].map((row) => Math.max(0, row.reduce((s, w, i) => s + w * prev[i], 0.15)));
    const max = Math.max(...raw, 1e-6);
    acts.push(raw.map((a) => a / max));
  }
  const norm = Math.hypot(...x) || 1;
  const scores = IDEAS.map(({ v }) => v.reduce((s, w, i) => s + w * x[i], 0) / (Math.hypot(...v) * norm));
  const exps = scores.map((s) => Math.exp(s / 0.12));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  const pmax = Math.max(...probs);
  acts.push(probs.map((p) => p / pmax));
  return { acts, probs };
}

export default function IdeaNetwork() {
  const [on, setOn] = useState<boolean[]>([true, false, false, true, false]);
  const [pass, setPass] = useState(0);
  const x = on.map((b) => (b ? 1 : 0));
  const empty = x.every((v) => v === 0);
  const { acts, probs } = useMemo(() => forward(x), [on]);

  const ranked = IDEAS.map((idea, i) => ({ ...idea, p: probs[i], i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3);
  const top = ranked[0]?.i;

  const toggle = (i: number) => {
    setOn((o) => o.map((v, j) => (j === i ? !v : v)));
    setPass((p) => p + 1);
  };

  const brainstorm = () => {
    let next: boolean[];
    do next = INPUTS.map(() => Math.random() < 0.45);
    while (next.every((v) => !v));
    setOn(next);
    setPass((p) => p + 1);
  };

  return (
    <div className="ideanet">
      <div className="ideanet-controls">
        <span className="mono ideanet-label">inputs</span>
        {INPUTS.map((name, i) => (
          <button
            key={name}
            className={`chip-btn ${on[i] ? "on" : ""}`}
            aria-pressed={on[i]}
            onClick={() => toggle(i)}
          >
            {name}
          </button>
        ))}
        <button className="chip-btn" onClick={brainstorm}>
          ⚡ Brainstorm
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="ideanet-svg" role="img" aria-label="Neural network diagram">
        {/* Edges: faint weight lines, plus a signal dash that travels when the source is active */}
        <g key={pass}>
          {WEIGHTS.map((rows, l) =>
            rows.map((row, j) =>
              row.map((w, i) => {
                const a = acts[l][i];
                const x1 = layerX(l), y1 = nodeY(l, i), x2 = layerX(l + 1), y2 = nodeY(l + 1, j);
                if (Math.abs(w) < 0.35) return null;
                return (
                  <g key={`${l}-${i}-${j}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} className="edge" style={{ opacity: 0.08 + Math.abs(w) * a * 0.4 }} />
                    {a > 0.2 && !empty && (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        pathLength={100}
                        className="edge-signal"
                        style={{ animationDelay: `${l * 380 + Math.abs(w) * 120}ms`, opacity: 0.35 + a * 0.6 }}
                      />
                    )}
                  </g>
                );
              })
            )
          )}
        </g>

        {acts.map((layer, l) =>
          layer.map((a, i) => {
            const isTop = l === 3 && i === top && !empty;
            return (
              <g key={`n-${l}-${i}`}>
                <circle
                  cx={layerX(l)}
                  cy={nodeY(l, i)}
                  r={l === 0 || l === 3 ? 9 : 7}
                  className={`neuron ${isTop ? "top" : ""}`}
                  style={{ fillOpacity: empty ? 0 : 0.12 + a * 0.88, transitionDelay: `${l * 380}ms` }}
                  onClick={l === 0 ? () => toggle(i) : undefined}
                />
                {l === 0 && (
                  <text x={layerX(0) - 16} y={nodeY(0, i) + 4} className="neuron-label" textAnchor="end">
                    {INPUTS[i][0]}
                  </text>
                )}
              </g>
            );
          })
        )}
        {["input", "hidden", "hidden", "output"].map((t, l) => (
          <text key={t + l} x={layerX(l)} y={H - 4} className="layer-label" textAnchor="middle">
            {t}
          </text>
        ))}
      </svg>

      <ol className="ideanet-out" aria-live="polite">
        {empty ? (
          <li className="muted">Select at least one input to run a forward pass.</li>
        ) : (
          ranked.map((r) => (
            <li key={r.name}>
              <span className="idea-name">{r.name}</span>
              <span className="idea-bar">
                <span style={{ width: `${Math.round(r.p * 100)}%` }} />
              </span>
              <span className="mono idea-p">{r.p.toFixed(2)}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
