import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "../hooks";

/*
 * Multi-agent system demo. An orchestrator receives a task, routes it to
 * specialist agents and assembles the result. Animated beams show each
 * message hop (Magic UI "Animated Beam" pattern) and the feed lists what each
 * agent says (Magic UI "Animated List" pattern). Scenarios are scripted.
 */

type NodeId = "user" | "orch" | "planner" | "research" | "coder" | "critic" | "output";

const NODES: { id: NodeId; label: string; icon: ReactNode }[] = [
  { id: "user", label: "User", icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" /> },
  { id: "output", label: "Result", icon: <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5" /> },
  { id: "orch", label: "Orchestrator", icon: <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 5h4v4h-4z" /> },
  { id: "planner", label: "Planner", icon: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /> },
  { id: "research", label: "Researcher", icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.35-4.35" /> },
  { id: "coder", label: "Coder", icon: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /> },
  { id: "critic", label: "Critic", icon: <path d="M20 6 9 17l-5-5" /> },
];

const EDGES: [NodeId, NodeId][] = [
  ["user", "orch"],
  ["orch", "output"],
  ["orch", "planner"],
  ["orch", "research"],
  ["orch", "coder"],
  ["orch", "critic"],
];

type Step = { from: NodeId; to: NodeId; who?: string; text?: string };

const hop = (agent: NodeId, who: string, text: string): Step[] => [
  { from: "orch", to: agent },
  { from: agent, to: "orch", who, text },
];

const SCENARIOS: { task: string; steps: Step[] }[] = [
  {
    task: "Read a receipt photo and log the expense",
    steps: [
      { from: "user", to: "orch", who: "User", text: "Read this receipt and log the expense." },
      ...hop("planner", "Planner", "Plan: OCR → extract fields → validate → save."),
      ...hop("research", "Researcher", "Found receipt schema: merchant, date, line items, total."),
      ...hop("coder", "Coder", "Ran OCR + field parser → {merchant: 'Campus Café', total: ₹428}."),
      ...hop("critic", "Critic", "Line items sum to total ✓ · date format valid ✓"),
      { from: "orch", to: "output", who: "Orchestrator", text: "Expense logged with 0 conflicts." },
    ],
  },
  {
    task: "Summarize a meeting and assign action items",
    steps: [
      { from: "user", to: "orch", who: "User", text: "Summarize today's stand-up and assign owners." },
      ...hop("planner", "Planner", "Plan: transcribe → segment topics → extract decisions → assign."),
      ...hop("research", "Researcher", "Matched 3 speakers to team roster; pulled last week's notes."),
      ...hop("coder", "Coder", "Generated summary (142 words) + 4 action items."),
      ...hop("critic", "Critic", "Every action item has an owner and a due date ✓"),
      { from: "orch", to: "output", who: "Orchestrator", text: "Summary shared; 4 tasks created." },
    ],
  },
  {
    task: "Qualify a new CRM lead and draft a follow-up",
    steps: [
      { from: "user", to: "orch", who: "User", text: "New lead came in — qualify it and draft a reply." },
      ...hop("planner", "Planner", "Plan: enrich lead → score fit → draft email → review tone."),
      ...hop("research", "Researcher", "Queried CRM records: company size, industry, past touchpoints."),
      ...hop("coder", "Coder", "Lead score 82/100 → drafted personalised follow-up."),
      ...hop("critic", "Critic", "Tone professional ✓ · no sensitive data leaked ✓"),
      { from: "orch", to: "output", who: "Orchestrator", text: "Lead marked hot; draft ready for approval." },
    ],
  },
];

const STEP_MS = 1300;

type FeedItem = { id: number; who: string; text: string; t: number };

export default function AgentSystem() {
  const reduced = useReducedMotion();
  const [wrapRef, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.25 });
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Partial<Record<NodeId, HTMLDivElement | null>>>({});
  const [centers, setCenters] = useState<Partial<Record<NodeId, { x: number; y: number }>>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(reduced ? SCENARIOS[0].steps.length : -1);
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    reduced
      ? SCENARIOS[0].steps
          .filter((s) => s.text)
          .map((s, i) => ({ id: i, who: s.who!, text: s.text!, t: i * 1.3 }))
          .reverse()
      : []
  );
  const feedId = useRef(100);

  // Measure node centres for the beams
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const r = stage.getBoundingClientRect();
      const next: typeof centers = {};
      for (const n of NODES) {
        const el = nodeRefs.current[n.id];
        if (!el) continue;
        const b = el.getBoundingClientRect();
        next[n.id] = { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
      }
      setCenters(next);
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Drive the scenario forward while visible
  useEffect(() => {
    if (reduced || !inView) return;
    const steps = SCENARIOS[scenario].steps;
    const done = step >= steps.length;
    const id = setTimeout(
      () => {
        if (done) {
          setScenario((s) => (s + 1) % SCENARIOS.length);
          setStep(-1);
          setFeed([]);
          return;
        }
        const next = step + 1;
        setStep(next);
        const s = steps[next];
        if (s?.text) {
          setFeed((f) => [{ id: feedId.current++, who: s.who!, text: s.text!, t: next * (STEP_MS / 1000) }, ...f].slice(0, 6));
        }
      },
      done ? 3200 : step === -1 ? 500 : STEP_MS
    );
    return () => clearTimeout(id);
  }, [step, scenario, inView, reduced]);

  const pick = (i: number) => {
    setScenario(i);
    setStep(-1);
    setFeed([]);
  };

  const steps = SCENARIOS[scenario].steps;
  const current = step >= 0 && step < steps.length ? steps[step] : null;
  const busy = new Set<NodeId>(current ? [current.from, current.to] : []);
  const finished = step >= steps.length;

  const curve = (a: NodeId, b: NodeId) => {
    const p = centers[a], q = centers[b];
    if (!p || !q) return "";
    const mx = (p.x + q.x) / 2;
    return `M ${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${q.y}, ${q.x} ${q.y}`;
  };

  const node = (id: NodeId) => {
    const n = NODES.find((x) => x.id === id)!;
    const isDone = finished && id === "output";
    return (
      <div
        key={id}
        ref={(el) => {
          nodeRefs.current[id] = el;
        }}
        className={`agent-node ${id === "orch" ? "orch" : ""} ${busy.has(id) ? "busy" : ""} ${isDone ? "done" : ""}`}
      >
        <span className="agent-ico">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {n.icon}
          </svg>
        </span>
        <span className="agent-label mono">{n.label}</span>
      </div>
    );
  };

  return (
    <div className="agents" ref={wrapRef}>
      <div className="agents-tasks">
        <span className="mono ideanet-label">task</span>
        {SCENARIOS.map((s, i) => (
          <button key={s.task} className={`chip-btn ${i === scenario ? "on" : ""}`} aria-pressed={i === scenario} onClick={() => pick(i)}>
            {s.task}
          </button>
        ))}
      </div>

      <div className="agents-body">
        <div className="agents-stage" ref={stageRef} role="img" aria-label="Diagram of an orchestrator agent routing a task to planner, researcher, coder and critic agents">
          <svg className="beams" width={size.w} height={size.h} aria-hidden="true">
            {EDGES.map(([a, b]) => (
              <path key={a + b} d={curve(a, b)} className="beam-base" />
            ))}
            {current && (
              <path
                key={`${scenario}-${step}`}
                d={curve(current.from, current.to)}
                pathLength={100}
                className="beam-signal"
                style={{ animationDuration: `${STEP_MS * 0.8}ms` }}
              />
            )}
          </svg>
          <div className="agents-col">{node("user")}{node("output")}</div>
          <div className="agents-col center">{node("orch")}</div>
          <div className="agents-col">{(["planner", "research", "coder", "critic"] as NodeId[]).map(node)}</div>
        </div>

        <div className="agent-feed" aria-live="polite">
          <div className="feed-head mono">
            <span className={`status-dot ${finished ? "" : "live"}`} /> {finished ? "task complete" : "agents working…"}
          </div>
          <ul>
            {feed.map((f) => (
              <li key={f.id} className="feed-item">
                <span className="feed-who mono">{f.who}</span>
                <span className="feed-text">{f.text}</span>
                <span className="feed-t mono">+{f.t.toFixed(1)}s</span>
              </li>
            ))}
            {!feed.length && <li className="feed-empty mono">waiting for task…</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
