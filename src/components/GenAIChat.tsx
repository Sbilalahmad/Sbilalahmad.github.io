import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "../hooks";

/*
 * "AI twin" chat. Answers are pre-written from my profile and streamed token
 * by token like an LLM response; the side panel visualises next-token
 * sampling (candidate probabilities are illustrative, not from a real model).
 */

const QA: { q: string; a: string }[] = [
  {
    q: "What do you build?",
    a: "I build AI-powered software end to end — from training and evaluating models in PyTorch and TensorFlow, to designing autonomous agents with Salesforce Agentforce, to shipping Android apps in Kotlin like an OCR text extractor. Lately I'm focused on agentic systems and RLHF.",
  },
  {
    q: "Tell me about your agent work",
    a: "During my internship at Infoglen I designed autonomous agents and smart workflows with Agentforce and Einstein, backed by Apex logic, Lightning Web Components and SOQL queries. I'm most interested in agents that plan, call tools and verify their output before acting.",
  },
  {
    q: "Why hire a fresher like you?",
    a: "I learn fast and I teach what I learn — I mentored peers as AI/ML Lead at AMU's Computer Science Society and led the tech team for AMUHACKS 4.0 with 200+ participants. Add a Mathematics degree, an MCA and hands-on Agentforce experience, and you get an engineer ready to contribute from day one.",
  },
  {
    q: "What are you exploring now?",
    a: "RLHF, ethical AI and multi-agent systems — aligning models with human feedback, keeping them safe and fair, and coordinating several agents on one task. I'm also keen on automation and cloud computing.",
  },
];

const tokenize = (s: string) => s.match(/\s*\S+/g) ?? [];

type Candidate = { tok: string; p: number };

export default function GenAIChat() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [qi, setQi] = useState(0);
  const tokens = useMemo(() => tokenize(QA[qi].a), [qi]);
  const [n, setN] = useState(reduced ? tokens.length : 0);
  const [started, setStarted] = useState(reduced);
  const [cands, setCands] = useState<Candidate[]>([]);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const bank = useMemo(() => [...new Set(QA.flatMap((x) => tokenize(x.a).map((t) => t.trim())))], []);

  useEffect(() => {
    if (inView && !started) {
      setStarted(true);
      t0.current = performance.now();
    }
  }, [inView, started]);

  useEffect(() => {
    if (reduced || !started || n >= tokens.length) return;
    const id = setTimeout(() => {
      const tok = tokens[n].trim();
      const p = 0.5 + Math.random() * 0.42;
      const alts = bank.filter((w) => w !== tok).sort(() => Math.random() - 0.5).slice(0, 2);
      const rest = 1 - p;
      const split = 0.55 + Math.random() * 0.3;
      setCands([
        { tok, p },
        { tok: alts[0], p: rest * split },
        { tok: alts[1], p: rest * (1 - split) * 0.6 },
      ]);
      setN((x) => x + 1);
      setElapsed((performance.now() - t0.current) / 1000);
    }, 35 + Math.random() * 55);
    return () => clearTimeout(id);
  }, [n, started, tokens, reduced, bank]);

  const ask = (i: number) => {
    setQi(i);
    setN(reduced ? tokenize(QA[i].a).length : 0);
    setCands([]);
    setStarted(true);
    t0.current = performance.now();
    setElapsed(0);
  };

  const streaming = started && n < tokens.length;
  const tps = elapsed > 0 ? Math.round(n / elapsed) : 0;

  return (
    <div className="genai" ref={ref}>
      <div className="chat">
        <div className="chat-head mono">
          <span className={`status-dot ${streaming ? "live" : ""}`} /> ai-twin · scripted demo
          <span className="chat-meta">
            {n} tokens{tps ? ` · ${tps} tok/s` : ""}
          </span>
        </div>
        <div className="chat-body">
          <div className="msg user">{QA[qi].q}</div>
          <div className="msg bot" aria-live="polite">
            {tokens.slice(0, n).join("")}
            {streaming && <span className="caret">▍</span>}
            {!started && <span className="t-dim mono">thinking…</span>}
          </div>
        </div>
        <div className="chat-prompts">
          {QA.map((x, i) => (
            <button key={x.q} className={`chip-btn ${i === qi ? "on" : ""}`} onClick={() => ask(i)} disabled={streaming && i === qi}>
              {x.q}
            </button>
          ))}
        </div>
      </div>

      <aside className="sampler" aria-label="Next-token sampling visualisation">
        <p className="mono sampler-title">next-token sampling</p>
        <p className="mono sampler-params">temperature 0.7 · top-k 3</p>
        <ul>
          {(cands.length ? cands : [{ tok: "—", p: 0 }, { tok: "—", p: 0 }, { tok: "—", p: 0 }]).map((c, i) => (
            <li key={i} className={i === 0 && c.p ? "chosen" : ""}>
              <span className="mono cand-tok">{c.tok}</span>
              <span className="idea-bar">
                <span style={{ width: `${Math.round(c.p * 100)}%` }} />
              </span>
              <span className="mono idea-p">{c.p.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="sampler-note">Each word is "sampled" from candidate tokens, the way a language model generates text. Probabilities here are illustrative.</p>
      </aside>
    </div>
  );
}
