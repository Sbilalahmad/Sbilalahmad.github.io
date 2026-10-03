import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "../hooks";

const GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]#$%&*+=?";

/** Characters scramble like a model "decoding" its output, then settle left to right. */
export function DecryptedText({ text, className, speed = 45 }: { text: string; className?: string; speed?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text : "");
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) {
      setShown(text);
      return;
    }
    let revealed = 0;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      if (frame % 2 === 0) revealed++;
      setShown(
        text
          .split("")
          .map((ch, i) => (ch === " " || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("")
      );
      if (revealed >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduced, run]);

  return (
    <span className={className} aria-label={text} onMouseEnter={() => setRun((r) => r + 1)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/** Types, holds, deletes and moves to the next phrase. */
export function TypeCycle({ words }: { words: string[] }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState({ w: 0, len: words[0].length, deleting: false });

  useEffect(() => {
    if (reduced) return;
    const word = words[state.w];
    let delay = state.deleting ? 40 : 85;
    if (!state.deleting && state.len === word.length) delay = 1800;
    if (state.deleting && state.len === 0) delay = 300;
    const id = setTimeout(() => {
      setState(({ w, len, deleting }) => {
        if (!deleting && len === words[w].length) return { w, len, deleting: true };
        if (deleting && len === 0) {
          const next = (w + 1) % words.length;
          return { w: next, len: 0, deleting: false };
        }
        return { w, len: len + (deleting ? -1 : 1), deleting };
      });
    }, delay);
    return () => clearTimeout(id);
  }, [state, words, reduced]);

  return <span>{words[state.w].slice(0, state.len)}</span>;
}

/** Eased count-up once the number scrolls into view. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const [val, setVal] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / 1400, 1);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduced]);

  return (
    <span ref={ref} className="num">
      {val}
      {val === to ? suffix : ""}
    </span>
  );
}
