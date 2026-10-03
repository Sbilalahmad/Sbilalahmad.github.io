import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useInView, useReducedMotion } from "../hooks";

/*
 * Three Retrieval-Augmented Generation strategies, each animated step by step
 * over a small knowledge base built from my own profile:
 *   Vector RAG  — embed the query, find nearest chunks, stuff them in the prompt
 *   Graph RAG   — link query entities to a knowledge graph and traverse it
 *   Agentic RAG — an agent plans, picks retrieval tools, checks coverage, loops
 * Everything is scripted for illustration; no model or database is called.
 */

type Pipeline = {
  id: string;
  name: string;
  tagline: string;
  query: string;
  steps: { title: string; desc: string }[];
  answer: string;
  Visual: (p: { step: number }) => ReactNode;
};

/* ---------------- Vector RAG ---------------- */

type Pt = { x: number; y: number; label?: string; score?: number };

const CLUSTERS: { name: string; cx: number; cy: number }[] = [
  { name: "experience", cx: 150, cy: 100 },
  { name: "projects", cx: 400, cy: 100 },
  { name: "education", cx: 140, cy: 235 },
  { name: "skills", cx: 400, cy: 235 },
];

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const VEC_POINTS: Pt[] = (() => {
  const r = seeded(11);
  const pts: Pt[] = [];
  for (const c of CLUSTERS)
    for (let i = 0; i < 7; i++) pts.push({ x: c.cx + (r() - 0.5) * 110, y: c.cy + (r() - 0.5) * 60 });
  return pts;
})();

const QUERY_PT = { x: 196, y: 104 };
const TOP_K: Pt[] = [
  { x: 168, y: 84, label: "Infoglen intern: Agentforce agents & workflows", score: 0.91 },
  { x: 236, y: 82, label: "Agentforce Workflows (internship project)", score: 0.87 },
  { x: 172, y: 136, label: "Infoglen: Apex, LWC, SOQL/SOSL", score: 0.82 },
];
const QUERY_VEC = [0.42, -0.18, 0.77, 0.05, -0.61, 0.33, 0.9, -0.27, 0.14, -0.48, 0.58, 0.21];

function VectorVisual({ step }: { step: number }) {
  const showQ = step >= 1;
  const search = step >= 2;
  const augment = step >= 3;
  return (
    <div className="rag-visual">
      <svg viewBox="0 0 540 300" className="rag-svg" role="img" aria-label="Embedding space with the query and its nearest document chunks">
        {CLUSTERS.map((c) => (
          <text key={c.name} x={c.cx} y={c.cy - 52} className="rag-cluster" textAnchor="middle">
            {c.name}
          </text>
        ))}
        {VEC_POINTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} className={`vec-pt ${search ? "dim" : ""}`} />
        ))}
        {search && <circle cx={QUERY_PT.x} cy={QUERY_PT.y} r={52} className="vec-radius" />}
        {TOP_K.map((p, i) => (
          <g key={i}>
            {search && <line x1={QUERY_PT.x} y1={QUERY_PT.y} x2={p.x} y2={p.y} className="vec-link" style={{ animationDelay: `${i * 150}ms` }} />}
            <circle cx={p.x} cy={p.y} r={search ? 6 : 4} className={`vec-pt ${search ? "hit" : ""}`} />
            {search && (
              <text x={p.x + 9} y={p.y - 8} className="vec-score">
                {p.score!.toFixed(2)}
              </text>
            )}
          </g>
        ))}
        {showQ && (
          <g className="pop">
            <rect x={QUERY_PT.x - 7} y={QUERY_PT.y - 7} width={14} height={14} transform={`rotate(45 ${QUERY_PT.x} ${QUERY_PT.y})`} className="vec-query" />
            <text x={QUERY_PT.x + 12} y={QUERY_PT.y + 20} className="vec-qlabel">
              query
            </text>
          </g>
        )}
      </svg>
      <div className="rag-side">
        <p className="rag-side-title mono">{augment ? "prompt context" : showQ ? "query embedding · 768-d (12 shown)" : "awaiting query"}</p>
        {showQ && !augment && (
          <svg viewBox="0 0 240 120" className="vec-bars pop" aria-hidden="true">
            <line x1={0} y1={60} x2={240} y2={60} className="vec-axis" />
            {QUERY_VEC.map((v, i) => {
              const h = Math.abs(v) * 52;
              return <rect key={i} x={i * 20 + 3} y={v >= 0 ? 60 - h : 60} width={14} height={h} rx={2} className="vec-bar" />;
            })}
          </svg>
        )}
        {augment && (
          <ol className="rag-ctx pop">
            {TOP_K.map((p, i) => (
              <li key={i}>
                <span className="mono">[{i + 1}]</span> {p.label}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ---------------- Graph RAG ---------------- */

type GNode = { id: string; label: string; x: number; y: number };

const G_NODES: GNode[] = [
  { id: "bilal", label: "Bilal", x: 270, y: 50 },
  { id: "tfi", label: "Tfi Text Extractor", x: 270, y: 160 },
  { id: "cv", label: "Computer Vision", x: 130, y: 215 },
  { id: "kotlin", label: "Kotlin", x: 410, y: 215 },
  { id: "sight", label: "Sight for Blinds", x: 70, y: 110 },
  { id: "cpp", label: "C++", x: 50, y: 275 },
  { id: "android", label: "Android", x: 490, y: 275 },
  { id: "css", label: "CSS AI/ML Lead", x: 450, y: 105 },
  { id: "infoglen", label: "Infoglen", x: 140, y: 30 },
  { id: "agentforce", label: "Agentforce", x: 40, y: 40 },
  { id: "amu", label: "AMU", x: 500, y: 30 },
];

const G_EDGES: [string, string, string][] = [
  ["bilal", "tfi", "built"],
  ["tfi", "cv", "uses"],
  ["tfi", "kotlin", "written_in"],
  ["kotlin", "android", "targets"],
  ["sight", "cv", "uses"],
  ["sight", "cpp", "written_in"],
  ["bilal", "sight", "built"],
  ["bilal", "css", "led"],
  ["css", "amu", "part_of"],
  ["bilal", "infoglen", "interned_at"],
  ["infoglen", "agentforce", "uses"],
];

const HOP1 = new Set(["tfi", "bilal", "cv", "kotlin"]);
const HOP2 = new Set([...HOP1, "sight", "android", "css"]);
const nodeById = Object.fromEntries(G_NODES.map((n) => [n.id, n]));

function GraphVisual({ step }: { step: number }) {
  const lit = step >= 3 ? HOP2 : step >= 2 ? HOP1 : step >= 1 ? new Set(["tfi"]) : new Set<string>();
  const edgeLit = (a: string, b: string) => step >= 2 && lit.has(a) && lit.has(b);
  const triples = G_EDGES.filter(([a, b]) => HOP2.has(a) && HOP2.has(b));
  return (
    <div className="rag-visual">
      <svg viewBox="0 0 540 300" className="rag-svg" role="img" aria-label="Knowledge graph traversal from the OCR app entity">
        {G_EDGES.map(([a, b, rel]) => {
          const p = nodeById[a], q = nodeById[b];
          const on = edgeLit(a, b);
          return (
            <g key={a + b}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={`g-edge ${on ? "on" : ""}`} />
              {on && (
                <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 4} className="g-rel" textAnchor="middle">
                  {rel}
                </text>
              )}
            </g>
          );
        })}
        {G_NODES.map((n) => {
          const seed = n.id === "tfi" && step >= 1;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={seed ? 11 : 8} className={`g-node ${lit.has(n.id) ? "on" : ""} ${seed ? "seed" : ""}`} />
              <text x={n.x} y={n.y + 24} className={`g-label ${lit.has(n.id) ? "on" : ""}`} textAnchor="middle">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rag-side">
        <p className="rag-side-title mono">
          {step >= 4 ? "subgraph → context triples" : step >= 1 ? "entities linked" : "awaiting query"}
        </p>
        {step >= 1 && step < 4 && (
          <ul className="rag-ctx pop">
            <li>
              <span className="mono">"OCR app"</span> → <strong>Tfi Text Extractor</strong>
            </li>
            <li className="t-dim">
              hops explored: {step >= 3 ? 2 : step >= 2 ? 1 : 0} · nodes: {lit.size}
            </li>
          </ul>
        )}
        {step >= 4 && (
          <ol className="rag-ctx pop">
            {triples.map(([a, b, rel]) => (
              <li key={a + b} className="mono triple">
                ({nodeById[a].label}) -[{rel}]→ ({nodeById[b].label})
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ---------------- Agentic RAG ---------------- */

type Stage = "plan" | "retrieve" | "evaluate" | "generate";

const AGENT_TRACE: { stage: Stage | null; tool?: "vector" | "graph"; kind: string; text: string }[] = [
  { stage: null, kind: "query", text: "Summarize Bilal's AI leadership experience, with dates." },
  { stage: "plan", kind: "thought", text: "Need roles and dates. Start with a semantic search over experience." },
  { stage: "retrieve", tool: "vector", kind: "action", text: 'vector_search("AI leadership roles") → 2 chunks: AI/ML Lead (Sep 2025 – Jan 2026), Mentor at Image Classes (May – Oct 2025)' },
  { stage: "evaluate", kind: "check", text: "Coverage incomplete — no hackathon leadership found. Loop again (iteration 2)." },
  { stage: "retrieve", tool: "graph", kind: "action", text: 'graph_query("Bilal -[led]-> ?") → AMUHACKS 4.0 tech team (Feb – Mar 2025), CSS AI/ML track' },
  { stage: "evaluate", kind: "check", text: "3 roles, all dated, sources agree ✓ — sufficient to answer." },
  { stage: "generate", kind: "answer", text: "Compose answer with citations." },
];

const STAGES: { id: Stage; label: string; x: number; y: number }[] = [
  { id: "plan", label: "Plan", x: 170, y: 50 },
  { id: "retrieve", label: "Retrieve", x: 290, y: 150 },
  { id: "evaluate", label: "Evaluate", x: 170, y: 250 },
  { id: "generate", label: "Generate", x: 430, y: 250 },
];

function AgenticVisual({ step }: { step: number }) {
  const cur = AGENT_TRACE[Math.min(step, AGENT_TRACE.length - 1)];
  const iteration = step >= 4 ? 2 : 1;
  const s = (id: Stage) => STAGES.find((x) => x.id === id)!;
  const arc = (a: Stage, b: Stage, bend = 0) => {
    const p = s(a), q = s(b);
    const mx = (p.x + q.x) / 2 + bend, my = (p.y + q.y) / 2;
    return `M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`;
  };
  const looping = step === 3 || step === 4;
  return (
    <div className="rag-visual">
      <svg viewBox="0 0 540 300" className="rag-svg" role="img" aria-label="Agent loop of plan, retrieve and evaluate, then generate">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="ag-arrowhead" />
          </marker>
        </defs>
        <path d={arc("plan", "retrieve", 40)} className="ag-edge" markerEnd="url(#arrow)" />
        <path d={arc("retrieve", "evaluate", 40)} className="ag-edge" markerEnd="url(#arrow)" />
        <path d={arc("evaluate", "plan", -70)} className={`ag-edge ${looping ? "on" : ""}`} markerEnd="url(#arrow)" />
        <path d={arc("evaluate", "generate")} className={`ag-edge ${step >= 6 ? "on" : ""}`} markerEnd="url(#arrow)" />
        <text x={80} y={155} className="g-rel" textAnchor="middle">
          not enough?
        </text>
        <text x={300} y={242} className="g-rel" textAnchor="middle">
          sufficient
        </text>

        {/* tools */}
        {(["vector", "graph"] as const).map((t, i) => {
          const on = cur.tool === t;
          const x = 420, y = 95 + i * 60;
          return (
            <g key={t}>
              <line x1={290} y1={150} x2={x - 50} y2={y} className={`ag-tool-link ${on ? "on" : ""}`} />
              <rect x={x - 50} y={y - 16} width={100} height={32} rx={8} className={`ag-tool ${on ? "on" : ""}`} />
              <text x={x} y={y + 4} className={`ag-tool-label ${on ? "on" : ""}`} textAnchor="middle">
                {t === "vector" ? "Vector DB" : "Knowledge Graph"}
              </text>
            </g>
          );
        })}

        {STAGES.map((st) => {
          const on = cur.stage === st.id;
          return (
            <g key={st.id}>
              <circle cx={st.x} cy={st.y} r={30} className={`ag-stage ${on ? "on" : ""}`} />
              <text x={st.x} y={st.y + 4} className={`ag-stage-label ${on ? "on" : ""}`} textAnchor="middle">
                {st.label}
              </text>
            </g>
          );
        })}
        <text x={20} y={290} className="g-rel">
          iteration {iteration}
        </text>
      </svg>
      <div className="rag-side">
        <p className="rag-side-title mono">agent trace (ReAct)</p>
        <ol className="rag-ctx trace">
          {AGENT_TRACE.slice(0, step + 1).map((t, i) => (
            <li key={i} className={`pop ${i === step ? "cur" : ""}`}>
              <span className="mono trace-kind">{t.kind}</span> {t.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ---------------- Pipelines ---------------- */

const PIPELINES: Pipeline[] = [
  {
    id: "vector",
    name: "Vector RAG",
    tagline: "Semantic similarity search over embedded text chunks.",
    query: "What did Bilal build during his internship?",
    steps: [
      { title: "Query", desc: "The user asks a question in natural language." },
      { title: "Embed", desc: "An embedding model turns the query into a dense vector." },
      { title: "Search", desc: "The vector DB returns the top-k chunks by cosine similarity." },
      { title: "Augment", desc: "Retrieved chunks are inserted into the LLM prompt as context." },
      { title: "Generate", desc: "The LLM answers, grounded in (and citing) the retrieved context." },
    ],
    answer:
      "During his Infoglen internship Bilal designed autonomous agents and smart workflows with Salesforce Agentforce and Einstein [1][2], backed by custom Apex logic, Lightning Web Components and optimised SOQL/SOSL queries [3].",
    Visual: VectorVisual,
  },
  {
    id: "graph",
    name: "Graph RAG",
    tagline: "Entity linking plus multi-hop traversal of a knowledge graph.",
    query: "How does Bilal's OCR app connect to his other AI work?",
    steps: [
      { title: "Query", desc: "The user asks a relationship question." },
      { title: "Link entities", desc: "Entities in the query are matched to graph nodes." },
      { title: "Hop 1", desc: "Traverse direct neighbours of the seed entity." },
      { title: "Hop 2", desc: "Expand one more hop to find indirect connections." },
      { title: "Build context", desc: "The subgraph is serialised into (subject, relation, object) triples." },
      { title: "Generate", desc: "The LLM reasons over the triples to explain the connection." },
    ],
    answer:
      "Tfi Text Extractor uses computer vision — the same capability behind his assistive Sight for Blinds project. It's written in Kotlin for Android, and both projects sit alongside his role leading the AI/ML track at AMU's Computer Science Society.",
    Visual: GraphVisual,
  },
  {
    id: "agentic",
    name: "Agentic RAG",
    tagline: "An agent plans, picks retrieval tools and loops until the evidence is sufficient.",
    query: AGENT_TRACE[0].text,
    steps: [
      { title: "Query", desc: "The task arrives at the agent." },
      { title: "Plan", desc: "The agent reasons about what information it needs." },
      { title: "Retrieve · vector", desc: "It calls the vector search tool." },
      { title: "Evaluate", desc: "It checks coverage, finds a gap and decides to loop." },
      { title: "Retrieve · graph", desc: "It switches tools and queries the knowledge graph." },
      { title: "Evaluate", desc: "Evidence is complete and consistent." },
      { title: "Generate", desc: "It writes the final answer from verified context." },
    ],
    answer:
      "Bilal led the AI/ML track at AMU's Computer Science Society as AI/ML Lead (Sep 2025 – Jan 2026), led the tech team for AMUHACKS 4.0 with 200+ participants (Feb – Mar 2025), and mentored school students in AI and prompt engineering at Image Classes (May – Oct 2025).",
    Visual: AgenticVisual,
  },
];

const STEP_MS = 2200;

function StreamedAnswer({ text, active }: { text: string; active: boolean }) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.match(/\s*\S+/g) ?? [], [text]);
  const [n, setN] = useState(0);
  useEffect(() => setN(active && reduced ? words.length : 0), [active, text, reduced, words.length]);
  useEffect(() => {
    if (!active || n >= words.length) return;
    const id = setTimeout(() => setN((x) => x + 1), 45);
    return () => clearTimeout(id);
  }, [active, n, words.length]);
  if (!active) return <span className="t-dim mono">answer appears after retrieval…</span>;
  return (
    <>
      {words.slice(0, n).join("")}
      {n < words.length && <span className="caret">▍</span>}
    </>
  );
}

export default function RagPipelines() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.25 });
  const [pi, setPi] = useState(0);
  const p = PIPELINES[pi];
  const last = p.steps.length - 1;
  const [step, setStep] = useState(reduced ? last : 0);
  const [playing, setPlaying] = useState(!reduced);

  useEffect(() => {
    if (!playing || !inView || step >= last) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 1200 : STEP_MS);
    return () => clearTimeout(id);
  }, [playing, inView, step, last]);

  const choose = (i: number) => {
    setPi(i);
    setStep(reduced ? PIPELINES[i].steps.length - 1 : 0);
    setPlaying(!reduced);
  };
  const go = (d: number) => {
    setPlaying(false);
    setStep((s) => Math.max(0, Math.min(last, s + d)));
  };
  const replay = () => {
    setStep(0);
    setPlaying(true);
  };

  // WAI-ARIA tabs: arrow keys move between strategies
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (pi + d + PIPELINES.length) % PIPELINES.length;
    choose(next);
    document.getElementById(`rag-tab-${PIPELINES[next].id}`)?.focus();
  };

  const done = step >= last;

  return (
    <div className="rag" ref={ref}>
      <div className="tabs" role="tablist" aria-label="RAG strategy" onKeyDown={onTabKey}>
        {PIPELINES.map((x, i) => (
          <button
            key={x.id}
            id={`rag-tab-${x.id}`}
            role="tab"
            aria-selected={i === pi}
            aria-controls="rag-panel"
            tabIndex={i === pi ? 0 : -1}
            className="tab"
            onClick={() => choose(i)}
          >
            {x.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="rag-panel" aria-labelledby={`rag-tab-${p.id}`} className="rag-panel">
        <p className="rag-tagline">{p.tagline}</p>

        <div className="rag-query">
          <span className="mono rag-q-label">query</span>
          <span className="rag-q-text">{p.query}</span>
        </div>

        <div className="rag-toolbar">
          <div className="rag-progress">
            <span className="rag-progress-text">
              Step {step + 1} of {p.steps.length} · <strong>{p.steps[step].title}</strong>
            </span>
            <span className="rag-progress-track" aria-hidden="true">
              <span style={{ width: `${((step + 1) / p.steps.length) * 100}%` }} />
            </span>
          </div>
          <div className="rag-controls">
            <button className="btn btn-ghost" onClick={() => go(-1)} disabled={step === 0}>
              ‹ Prev
            </button>
            <button className="btn btn-ghost" onClick={() => (done ? replay() : setPlaying((v) => !v))}>
              {done ? "↻ Replay" : playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button className="btn btn-ghost" onClick={() => go(1)} disabled={done}>
              Next ›
            </button>
          </div>
        </div>

        <div className="rag-main">
          <p.Visual step={step} />
          <ol className="rag-steps" aria-label="Pipeline steps">
            {p.steps.map((s, i) => (
              <li key={s.title + i} className={i === step ? "cur" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
                <span className="mono rag-step-n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{s.title}</strong>
                  <span className="rag-step-desc">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rag-answer" aria-live="polite">
          <span className="mono rag-q-label">answer</span>
          <p>
            <StreamedAnswer text={p.answer} active={done} />
          </p>
        </div>
      </div>
      <p className="rag-note">Illustrative pipelines over a tiny knowledge base built from this portfolio — no model or database is called.</p>
    </div>
  );
}
