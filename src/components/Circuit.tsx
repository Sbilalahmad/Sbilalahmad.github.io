import { useEffect, useRef } from "react";
import { useCssVars, useReducedMotion } from "../hooks";

/**
 * Circuit-board background: PCB-style traces (0°/45°/90°) with solder pads.
 * Accent "data packets" travel along the traces, and traces near the cursor
 * light up. Static traces are drawn once to an offscreen canvas; each frame
 * only redraws the packets and the hover highlight. Flat colours only.
 */

type Trace = {
  pts: number[];
  segs: { x1: number; y1: number; x2: number; y2: number; mx: number; my: number; len: number }[];
  len: number;
  /** starts at a chip pin (no solder pad at that end) */
  fromChip: boolean;
  /** indices into pts of bends drawn as vias */
  vias: number[];
};
type Packet = { t: Trace; d: number; speed: number; dir: 1 | -1 };
type Chip = { x: number; y: number; w: number; h: number; pins: { x: number; y: number; dx: number; dy: number }[] };

const DIRS: [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

type Rect = { x: number; y: number; w: number; h: number };

function buildBoard(w: number, h: number, G: number, avoid: Rect[]): { traces: Trace[]; chips: Chip[] } {
  const cols = Math.ceil(w / G), rows = Math.ceil(h / G);
  const used = new Set<number>();
  const key = (c: number, r: number) => r * cols + c;
  const free = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && !used.has(key(c, r));
  const traces: Trace[] = [];
  const chips: Chip[] = [];

  // Keep the board clear behind content so text stays readable
  for (const a of avoid)
    for (let r = Math.floor(a.y / G); r <= Math.floor((a.y + a.h) / G); r++)
      for (let c = Math.floor(a.x / G); c <= Math.floor((a.x + a.w) / G); c++) used.add(key(c, r));

  /** Grows a trace from (c, r) heading `di`; `start` is an extra leading point (chip pin). */
  const grow = (c: number, r: number, di: number, maxLen: number, start?: [number, number]) => {
    if (!free(c, r)) return;
    const cells: [number, number][] = [[c, r]];
    used.add(key(c, r));
    for (let s = 0; s < maxLen; s++) {
      if (s > 1 && Math.random() < 0.28) di = (di + (Math.random() < 0.5 ? 1 : 7)) % 8; // ±45° bend
      const nc = c + DIRS[di][0], nr = r + DIRS[di][1];
      if (!free(nc, nr)) break;
      c = nc; r = nr;
      used.add(key(c, r));
      cells.push([c, r]);
    }
    if (cells.length < (start ? 2 : 3)) return;

    // Merge collinear cells into straight segments; remember bends for vias
    const pts: number[] = start ? [...start] : [];
    const vias: number[] = [];
    cells.forEach(([cc, rr], i) => {
      const x = (cc + 0.5) * G, y = (rr + 0.5) * G;
      if (i > 0 && i < cells.length - 1) {
        const [pc, pr] = cells[i - 1], [qc, qr] = cells[i + 1];
        if (cc - pc === qc - cc && rr - pr === qr - rr) return;
        if (Math.random() < 0.35) vias.push(pts.length);
      }
      pts.push(x, y);
    });
    const segs = [];
    let len = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const x1 = pts[i - 2], y1 = pts[i - 1], x2 = pts[i], y2 = pts[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      segs.push({ x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, len: l });
      len += l;
    }
    traces.push({ pts, segs, len, fromChip: !!start, vias });
  };

  // 1. Chips (IC packages) in open areas, with traces fanning out from their pins
  const chipTarget = Math.max(2, Math.min(7, Math.round((cols * rows) / 160)));
  for (let attempt = 0; attempt < 200 && chips.length < chipTarget; attempt++) {
    const cw = 3 + Math.floor(Math.random() * 3), ch = 2 + Math.floor(Math.random() * 2);
    const c0 = 1 + Math.floor(Math.random() * (cols - cw - 2)), r0 = 1 + Math.floor(Math.random() * (rows - ch - 2));
    let ok = true;
    for (let r = r0 - 1; r <= r0 + ch && ok; r++) for (let c = c0 - 1; c <= c0 + cw && ok; c++) ok = free(c, r);
    if (!ok) continue;
    for (let r = r0; r < r0 + ch; r++) for (let c = c0; c < c0 + cw; c++) used.add(key(c, r));
    const chip: Chip = { x: c0 * G + 4, y: r0 * G + 4, w: cw * G - 8, h: ch * G - 8, pins: [] };
    chips.push(chip);
    for (let c = c0; c < c0 + cw; c++) {
      const x = (c + 0.5) * G;
      chip.pins.push({ x, y: chip.y, dx: 0, dy: -1 }, { x, y: chip.y + chip.h, dx: 0, dy: 1 });
    }
    for (let r = r0; r < r0 + ch; r++) {
      const y = (r + 0.5) * G;
      chip.pins.push({ x: chip.x, y, dx: -1, dy: 0 }, { x: chip.x + chip.w, y, dx: 1, dy: 0 });
    }
    for (const pin of chip.pins) {
      if (Math.random() < 0.3) continue;
      const di = DIRS.findIndex(([dx, dy]) => dx === pin.dx && dy === pin.dy);
      const pc = Math.floor(pin.x / G) + pin.dx, pr = Math.floor(pin.y / G) + (pin.dy > 0 ? 1 : pin.dy < 0 ? -1 : 0);
      grow(pc, pr, di, 4 + Math.floor(Math.random() * 10), [pin.x + pin.dx * 5, pin.y + pin.dy * 5]);
    }
  }

  // 2. Free-running traces fill the rest
  const target = traces.length + Math.floor((cols * rows) / 13);
  for (let attempt = 0; attempt < target * 6 && traces.length < target; attempt++) {
    grow(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), Math.floor(Math.random() * 4) * 2, 5 + Math.floor(Math.random() * 12));
  }
  return { traces, chips };
}

function pointAt(t: Trace, d: number): [number, number] {
  d = Math.max(0, Math.min(t.len, d));
  for (const s of t.segs) {
    if (d <= s.len) {
      const k = d / s.len;
      return [s.x1 + (s.x2 - s.x1) * k, s.y1 + (s.y2 - s.y1) * k];
    }
    d -= s.len;
  }
  const last = t.segs[t.segs.length - 1];
  return [last.x2, last.y2];
}

export default function Circuit({
  grid = 28,
  packets = 24,
  radius = 150,
  avoid = [],
}: {
  grid?: number;
  packets?: number;
  radius?: number;
  /** selectors of elements (measured at load) to keep traces away from */
  avoid?: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const c = useCssVars(["--border", "--accent", "--bg"] as const);
  // Colours live in a ref so a theme change repaints without rebuilding the board
  const colors = useRef(c);
  const repaint = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, visible = true, last = performance.now();
    let traces: Trace[] = [];
    let chips: Chip[] = [];
    let live: Packet[] = [];
    const mouse = { x: -1e4, y: -1e4 };

    const drawStatic = () => {
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, w, h);
      lctx.strokeStyle = colors.current["--border"];
      lctx.lineWidth = 1.2;
      lctx.lineJoin = "round";
      for (const t of traces) {
        lctx.beginPath();
        for (let i = 0; i < t.pts.length; i += 2) (i ? lctx.lineTo : lctx.moveTo).call(lctx, t.pts[i], t.pts[i + 1]);
        lctx.stroke();
      }
      // Solder pads at free ends; small filled vias at some bends
      lctx.fillStyle = colors.current["--bg"];
      for (const t of traces) {
        for (const i of t.fromChip ? [t.pts.length - 2] : [0, t.pts.length - 2]) {
          lctx.beginPath();
          lctx.arc(t.pts[i], t.pts[i + 1], 3.2, 0, Math.PI * 2);
          lctx.fill();
          lctx.stroke();
        }
      }
      lctx.fillStyle = colors.current["--border"];
      for (const t of traces)
        for (const i of t.vias) {
          lctx.beginPath();
          lctx.arc(t.pts[i], t.pts[i + 1], 2.2, 0, Math.PI * 2);
          lctx.fill();
        }

      // Chips: package body, pin stubs, orientation notch, die outline
      for (const chip of chips) {
        lctx.strokeStyle = colors.current["--border"];
        lctx.lineWidth = 1.2;
        lctx.beginPath();
        for (const p of chip.pins) {
          lctx.moveTo(p.x, p.y);
          lctx.lineTo(p.x + p.dx * 5, p.y + p.dy * 5);
        }
        lctx.stroke();
        lctx.fillStyle = colors.current["--bg"];
        lctx.beginPath();
        lctx.roundRect(chip.x, chip.y, chip.w, chip.h, 3);
        lctx.fill();
        lctx.stroke();
        lctx.setLineDash([3, 3]);
        lctx.strokeRect(chip.x + 8, chip.y + 8, chip.w - 16, chip.h - 16);
        lctx.setLineDash([]);
        lctx.fillStyle = colors.current["--border"];
        lctx.beginPath();
        lctx.arc(chip.x + 6, chip.y + 6, 2, 0, Math.PI * 2);
        lctx.fill();
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      for (const cv of [canvas, layer]) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const box = canvas.getBoundingClientRect();
      const rects = avoid.flatMap((sel) =>
        [...document.querySelectorAll(sel)].map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - box.left - 12, y: r.top - box.top - 12, w: r.width + 24, h: r.height + 24 };
        })
      );
      ({ traces, chips } = buildBoard(w, h, grid, rects));
      live = [];
      drawStatic();
    };

    const spawn = () => {
      const t = traces[Math.floor(Math.random() * traces.length)];
      if (!t || t.len < grid * 3) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      live.push({ t, d: dir === 1 ? 0 : t.len, speed: 70 + Math.random() * 90, dir });
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // drawImage throws on a 0×0 canvas (e.g. hero hidden or not laid out yet)
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layer, 0, 0, w, h);

      // Cursor proximity: light up nearby trace segments
      ctx.strokeStyle = colors.current["--accent"];
      ctx.lineWidth = 1.4;
      for (const t of traces)
        for (const s of t.segs) {
          const k = 1 - Math.hypot(s.mx - mouse.x, s.my - mouse.y) / radius;
          if (k <= 0) continue;
          ctx.globalAlpha = k * 0.9;
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.stroke();
        }

      // Data packets: a short bright tail with a head dot
      if (!reduced) {
        while (live.length < packets) spawn();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.fillStyle = colors.current["--accent"];
        live = live.filter((p) => {
          p.d += p.speed * dt * p.dir;
          if (p.d < 0 || p.d > p.t.len) return false;
          const tail = 26;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const [x, y] = pointAt(p.t, p.d - p.dir * (tail * k) / 6);
            (k ? ctx.lineTo : ctx.moveTo).call(ctx, x, y);
          }
          ctx.stroke();
          const [hx, hy] = pointAt(p.t, p.d);
          ctx.beginPath();
          ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
          ctx.fill();
          return true;
        });
      }
      ctx.globalAlpha = 1;
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };

    // When the rAF loop is running it picks up changes on the next frame;
    // calling frame() then would start a second, parallel loop.
    const redrawIfIdle = () => {
      if (reduced || !visible) frame(performance.now());
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      if (reduced) frame(performance.now());
    };
    const onLeave = () => (mouse.x = mouse.y = -1e4);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });

    resize();
    frame(performance.now());
    io.observe(canvas);
    let lastW = w;
    const ro = new ResizeObserver(() => {
      // Height-only changes (mobile URL bar) shouldn't reshuffle the board
      if (Math.abs(canvas.clientWidth - lastW) < 2 && Math.abs(canvas.clientHeight - h) < 80) return;
      lastW = canvas.clientWidth;
      resize();
      redrawIfIdle();
    });
    ro.observe(canvas);
    repaint.current = () => {
      drawStatic();
      redrawIfIdle();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [grid, packets, radius, reduced, avoid.join()]);

  useEffect(() => {
    colors.current = c;
    repaint.current();
  }, [c]);

  return <canvas ref={ref} className="circuit" aria-hidden="true" />;
}
