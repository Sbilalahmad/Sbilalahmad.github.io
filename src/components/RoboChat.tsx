import { useEffect, useRef, useState, type FormEvent } from "react";
import { aiTwin, profile } from "../data";
import WalkingRobot from "./WalkingRobot";

/*
 * Walking robot chat widget. Answers questions from the AI twin Q&A (edited in
 * /admin), then collects the visitor's name, email and message and posts them
 * to a Google Sheet via an Apps Script web app (URL set in /admin → Profile).
 * With no sheet URL configured it falls back to opening the visitor's mail app.
 */

type Msg = { from: "bot" | "user"; text: string };
type Stage = "chat" | "name" | "email" | "message" | "sending" | "done";

const STOP = new Set(
  "the a an and or but to of in on for with about your you are is do what why how who me my i it this that tell can".split(" ")
);
const words = (s: string) =>
  s
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];

const CONTACT_RE = /\b(hire|hiring|contact|reach|email|mail|message|talk|call|meet|resume|cv|job|role|opportunit|freelance|collab)/i;
const GREET_RE = /^\s*(hi|hey|hello|yo|salam|assalam|good (morning|evening|afternoon))\b/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Best matching Q&A answer by keyword overlap, or null. */
function findAnswer(input: string): string | null {
  const q = new Set(words(input));
  if (!q.size) return null;
  let best = 0;
  let answer: string | null = null;
  for (const { q: question, a } of aiTwin) {
    let score = 0;
    for (const w of new Set(words(question))) if (q.has(w)) score += 2;
    for (const w of new Set(words(a))) if (q.has(w)) score += 1;
    if (score > best) {
      best = score;
      answer = a;
    }
  }
  return best >= 2 ? answer : null;
}

const firstName = profile.name.split(" ").find((p) => p.length > 1) ?? profile.name;
const GREETING = `Hi! I'm ${firstName}'s robot assistant. Ask me about his work, or leave a message and he'll get back to you.`;
const LEAVE = "Leave a message";

export default function RoboChat() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [stage, setStage] = useState<Stage>("chat");
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const lead = useRef({ name: "", email: "", message: "" });
  const asked = useRef<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // One-time "say hi" bubble per browser session; the robot holds its home spot
  // while the bubble is up.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("robo-hint") === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) return;
    const show = setTimeout(() => setHint(true), 1000);
    const hide = setTimeout(() => setHint(false), 9000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stage]);

  const toggle = () => {
    setHint(false);
    try {
      sessionStorage.setItem("robo-hint", "1");
    } catch {
      /* storage unavailable */
    }
    setOpen((o) => !o);
  };
  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  const say = (...m: Msg[]) => setMsgs((prev) => [...prev, ...m]);
  const bot = (text: string): Msg => ({ from: "bot", text });
  const user = (text: string): Msg => ({ from: "user", text });

  const startLead = (prefill = "") => {
    lead.current = { name: "", email: "", message: prefill };
    setStage("name");
    return bot(prefill ? `I'll pass that on to ${firstName}. What's your name?` : `Happy to pass a message to ${firstName}. What's your name?`);
  };

  const submit = async () => {
    setStage("sending");
    const { name, email, message } = lead.current;
    const url = profile.chatbotSheetUrl;
    if (!url) {
      const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      say(bot(`Opening your email app so you can send it, ${name}. Thanks for reaching out!`));
      setStage("done");
      return;
    }
    try {
      // text/plain + no-cors avoids a CORS preflight, which Apps Script can't answer.
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          name: name.slice(0, 200),
          email: email.slice(0, 200),
          message: message.slice(0, 4000),
          asked: asked.current.slice(-10).join(" | ").slice(0, 1000),
          page: location.href,
        }),
      });
      say(bot(`Got it, ${name}! ${firstName} will reply to ${email} soon.`));
      setStage("done");
    } catch {
      say(bot(`Sorry, that didn't go through. You can email ${firstName} directly at ${profile.email}.`));
      setStage("message");
    }
  };

  const handle = (raw: string) => {
    const text = raw.trim();
    if (!text || stage === "sending") return;
    setErr("");

    if (stage === "chat" || stage === "done") {
      setStage("chat");
      asked.current.push(text);
      if (text === LEAVE || CONTACT_RE.test(text)) return say(user(text), startLead(text === LEAVE ? "" : text));
      const a = findAnswer(text);
      if (a) return say(user(text), bot(a));
      if (GREET_RE.test(text)) return say(user(text), bot("Hello! Pick a question below or type your own."));
      return say(user(text), bot("I'm not sure about that one."), startLead(text));
    }
    if (stage === "name") {
      lead.current.name = text.slice(0, 200);
      setStage("email");
      return say(user(text), bot(`Nice to meet you, ${lead.current.name}. What's your email?`));
    }
    if (stage === "email") {
      if (!EMAIL_RE.test(text)) return setErr("That doesn't look like an email. Try again?");
      lead.current.email = text;
      say(user(text));
      if (lead.current.message) {
        say(bot("Sending your message…"));
        return void submit();
      }
      setStage("message");
      return say(bot(`What would you like to tell ${firstName}?`));
    }
    if (stage === "message") {
      lead.current.message = text;
      say(user(text), bot("Sending your message…"));
      return void submit();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handle(input);
    setInput("");
  };

  const placeholder =
    stage === "name" ? "Your name" : stage === "email" ? "you@example.com" : stage === "message" ? "Your message" : "Ask me something…";
  const showChips = stage === "chat" || stage === "done";

  return (
    <>
      {open && (
        <div className="robo-panel" role="dialog" aria-label={`Chat with ${firstName}'s assistant`}>
          <div className="robo-head">
            <RobotSvg className="robo-head-icon" />
            <div>
              <strong>{firstName}'s assistant</strong>
              <span className="mono">answers · leaves messages</span>
            </div>
            <button className="robo-x" onClick={close} aria-label="Close chat">
              ×
            </button>
          </div>
          <div className="robo-log" ref={logRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          {showChips && (
            <div className="robo-chips">
              {aiTwin.map((x) => (
                <button key={x.q} className="chip-btn" onClick={() => handle(x.q)}>
                  {x.q}
                </button>
              ))}
              <button className="chip-btn on" onClick={() => handle(LEAVE)}>
                {LEAVE}
              </button>
            </div>
          )}
          <form className="robo-input" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              type={stage === "email" ? "email" : "text"}
              autoComplete={stage === "name" ? "name" : stage === "email" ? "email" : "off"}
              maxLength={stage === "message" || stage === "chat" ? 2000 : 200}
              disabled={stage === "sending"}
              aria-label={placeholder}
              aria-invalid={!!err}
            />
            <button type="submit" className="btn btn-primary" disabled={stage === "sending" || !input.trim()}>
              Send
            </button>
          </form>
          {err && (
            <p className="robo-err" role="alert">
              {err}
            </p>
          )}
        </div>
      )}

      <WalkingRobot
        hold={open || hint}
        label={open ? "Close chat" : "Open chat assistant"}
        expanded={open}
        onActivate={toggle}
        buttonRef={launcherRef}
      >
        {hint && !open && <div className="robo-bubble">Hi! Got a question? 👋</div>}
      </WalkingRobot>
    </>
  );
}

/** Static robot icon for the chat header. */
function RobotSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 80" aria-hidden="true">
      {/* antenna */}
      <line x1="32" y1="4" x2="32" y2="12" className="r-line" />
      <circle cx="32" cy="4" r="3" className="r-accent" />
      {/* head + visor (eyes look toward walking direction) */}
      <rect x="14" y="12" width="36" height="24" rx="8" className="r-body" />
      <rect x="20" y="18" width="26" height="11" rx="5" className="r-visor" />
      <circle cx="29" cy="23.5" r="2.4" className="r-accent" />
      <circle cx="39" cy="23.5" r="2.4" className="r-accent" />
      {/* arms */}
      <g className="r-arm r-arm-l">
        <rect x="9" y="40" width="6" height="16" rx="3" className="r-body" />
      </g>
      <g className="r-arm r-arm-r">
        <rect x="49" y="40" width="6" height="16" rx="3" className="r-body" />
      </g>
      {/* torso */}
      <rect x="17" y="38" width="30" height="22" rx="6" className="r-body" />
      <rect x="27" y="44" width="10" height="5" rx="2" className="r-accent" />
      {/* legs */}
      <g className="r-leg r-leg-l">
        <rect x="21" y="59" width="8" height="15" rx="3" className="r-body" />
        <rect x="19" y="72" width="12" height="5" rx="2.5" className="r-foot" />
      </g>
      <g className="r-leg r-leg-r">
        <rect x="35" y="59" width="8" height="15" rx="3" className="r-body" />
        <rect x="33" y="72" width="12" height="5" rx="2.5" className="r-foot" />
      </g>
    </svg>
  );
}
