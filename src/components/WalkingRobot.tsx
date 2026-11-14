import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "../hooks";

/*
 * Procedurally animated robot that patrols the bottom of the screen.
 *
 * - Locomotion: velocity/acceleration controller with arrive-style braking; the
 *   robot turns around (pseudo-3D flip) before changing direction.
 * - Gait: walk phase advances by distance travelled, so stance feet stay planted
 *   on the ground (no skating). Stride length scales with speed.
 * - Legs: two-bone IK (hip → knee → ankle), knees bend forward.
 * - Secondary motion: damped springs for torso lean, head lag, antenna wobble,
 *   landing squash; arms counter-swing the legs.
 * - Idle: breathing, blinking, eyes following the pointer.
 *
 * All drawing is in a right-facing frame (viewBox 80×100); facing left is a
 * horizontal flip. Per-frame updates write SVG attributes directly (no React
 * re-render).
 */

const CX = 40;
const GY = 95; // ground line
const HIP0 = 64.5; // rest hip height (legs nearly straight, slight knee bend)
const L1 = 14.5; // thigh
const L2 = 14.5; // shin
const NECK = HIP0 - 26;
const SHOULDER = HIP0 - 20;
const MAX_V = 72; // px/s
const ACCEL = 150; // px/s²
const STRIDE = 13; // local units at full speed
const STEP_H = 5;
const BOB = 2.2;
const GRAVITY = 420; // local units/s²

type Mode = "idle" | "turn" | "walk";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Two-bone IK: returns the knee for a hip→ankle chain, knee bending forward (+x). */
function knee(hx: number, hy: number, ax: number, ay: number) {
  const dx = ax - hx;
  const dy = ay - hy;
  const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const a = base - off;
  return [hx + L1 * Math.cos(a), hy + L1 * Math.sin(a)] as const;
}

type Props = {
  /** Stay at (or walk back to) the home spot. */
  hold: boolean;
  label: string;
  expanded: boolean;
  onActivate: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  children?: ReactNode;
};

export default function WalkingRobot({ hold, label, expanded, onActivate, buttonRef, children }: Props) {
  const reduced = useReducedMotion();
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const hopRef = useRef(() => {});

  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const r = {
    shadow: useRef<SVGEllipseElement>(null),
    root: useRef<SVGGElement>(null),
    face: useRef<SVGGElement>(null),
    backLayer: useRef<SVGGElement>(null),
    frontLayer: useRef<SVGGElement>(null),
    torso: useRef<SVGGElement>(null),
    head: useRef<SVGGElement>(null),
    chest: useRef<SVGRectElement>(null),
    antenna: useRef<SVGLineElement>(null),
    antennaO: useRef<SVGLineElement>(null),
    tip: useRef<SVGCircleElement>(null),
    eyes: useRef<SVGGElement>(null),
    armB: useRef<SVGGElement>(null),
    armF: useRef<SVGGElement>(null),
    foreB: useRef<SVGGElement>(null),
    foreF: useRef<SVGGElement>(null),
    legBo: useRef<SVGPathElement>(null),
    legB: useRef<SVGPathElement>(null),
    legFo: useRef<SVGPathElement>(null),
    legF: useRef<SVGPathElement>(null),
    kneeB: useRef<SVGCircleElement>(null),
    kneeF: useRef<SVGCircleElement>(null),
    footB: useRef<SVGRectElement>(null),
    footF: useRef<SVGRectElement>(null),
  };

  useEffect(() => {
    const s = {
      x: 0, v: 0, a: 0, face: -1, f: -1, mode: "idle" as Mode, idleT: 2.5, target: 0,
      phase: 0, gait: 0, lean: 0, leanV: 0, head: 0, headV: 0, ant: 0, antV: 0,
      jumpY: 0, jumpV: 0, squash: 0, squashV: 0, blinkT: 2.5, blink: 0, t: 0,
      lookX: 0, lookY: 0, glance: 0, glanceT: 3,
    };
    let svgW = 64;
    let svgH = 80;
    const measure = () => {
      if (!svg.current) return;
      svgW = svg.current.clientWidth || 64;
      svgH = svg.current.clientHeight || 80;
    };
    measure();
    window.addEventListener("resize", measure);

    const pointer = { x: -1e4, y: -1e4, at: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    hopRef.current = () => {
      if (reduced || s.jumpY < 0) return;
      s.squashV -= 1.6; // anticipation dip
      s.jumpV = -82;
      s.antV += 260;
    };

    const maxDist = () => (innerWidth < 600 ? Math.max(0, innerWidth - 100) : Math.min(innerWidth * 0.45, 520));

    const begin = () => {
      const dir = Math.sign(s.target - s.x) || s.face;
      if (dir !== s.face) {
        s.face = dir;
        s.mode = "turn";
      } else s.mode = "walk";
    };

    const step = (dt: number) => {
      s.t += dt;
      const hold = holdRef.current;
      const lim = maxDist();
      if (s.target < -lim) s.target = -lim;
      if (s.x < -lim - 1) s.x = -lim;

      // ---------- locomotion ----------
      let dx = 0;
      if (hold && s.target !== 0) {
        s.target = 0;
        if (s.mode === "idle") begin();
      }
      if (s.mode === "idle") {
        s.a = 0;
        s.idleT -= dt;
        if (!hold && s.idleT <= 0 && lim > 80) {
          let tgt = s.x;
          for (let i = 0; i < 8 && Math.abs(tgt - s.x) < 70; i++) tgt = -Math.random() * lim;
          // Drift back toward home more often than not
          if (Math.random() < 0.35) tgt = 0;
          s.target = Math.abs(tgt - s.x) < 20 ? (s.x < -lim / 2 ? 0 : -lim * 0.8) : tgt;
          begin();
        }
      } else if (s.mode === "turn") {
        s.a = 0;
        s.f += Math.sign(s.face - s.f) * dt * 5.5;
        if (Math.abs(s.f - s.face) < 0.06 || Math.sign(s.f - s.face) === Math.sign(s.face)) {
          s.f = s.face;
          if (Math.abs(s.target - s.x) < 1) {
            s.mode = "idle";
            s.idleT = 1.5 + Math.random() * 3;
          } else s.mode = "walk";
        }
      } else {
        const dist = s.target - s.x;
        const need = Math.sign(dist) || s.face;
        const desired = need === s.face ? clamp(dist * 1.7, -MAX_V, MAX_V) : 0;
        s.a = clamp((desired - s.v) * 3.2, -ACCEL, ACCEL);
        s.v += s.a * dt;
        dx = s.v * dt;
        s.x += dx;
        if (need !== s.face && Math.abs(s.v) < 3) {
          s.v = 0;
          s.face = need;
          s.mode = "turn";
        } else if (Math.abs(dist) < 0.8 && Math.abs(s.v) < 5) {
          s.x = s.target;
          s.v = 0;
          s.a = 0;
          // At home, turn to face the page
          if (s.x === 0 && s.face !== -1) {
            s.face = -1;
            s.mode = "turn";
          } else {
            s.mode = "idle";
            s.idleT = 2 + Math.random() * 4;
          }
        }
      }

      // ---------- gait ----------
      const scale = svgW / 80;
      const speed = Math.abs(s.v);
      const rr = Math.min(speed / MAX_V, 1);
      const stride = STRIDE * (0.35 + 0.65 * rr);
      const prevPhase = s.phase;
      s.phase = (s.phase + Math.abs(dx / scale) / (2 * stride)) % 1;
      // Foot strike (phase crosses 0 or 0.5) → small impact squash
      if (dx !== 0 && Math.floor(prevPhase * 2) !== Math.floor(s.phase * 2)) {
        s.squashV += 0.25 * rr;
      }
      const moving = s.mode === "walk" && speed > 1;
      s.gait += ((moving ? 1 : 0) - s.gait) * Math.min(1, dt * 7);
      const g = s.gait;

      const foot = (off: number) => {
        const p = (s.phase + off) % 1;
        let fx: number, fy: number, tilt: number;
        if (p < 0.5) {
          const t = p / 0.5;
          fx = stride / 2 - stride * t; // moves back exactly with the body: planted
          fy = 0;
          tilt = 0;
        } else {
          const t = (p - 0.5) / 0.5;
          fx = -stride / 2 + stride * smooth(t);
          fy = -STEP_H * (0.6 + 0.4 * rr) * Math.sin(Math.PI * t);
          tilt = -14 * Math.sin(Math.PI * t); // toe lifts mid-swing
        }
        return [fx * g, fy * g, tilt * g] as const;
      };

      // ---------- jump + squash ----------
      if (s.jumpY < 0 || s.jumpV !== 0) {
        s.jumpV += GRAVITY * dt;
        s.jumpY += s.jumpV * dt;
        if (s.jumpY >= 0) {
          s.squashV += s.jumpV * 0.02;
          s.antV -= s.jumpV * 2.2;
          s.jumpY = 0;
          s.jumpV = 0;
        }
      }
      s.squashV += (-s.squash * 320 - s.squashV * 15) * dt;
      s.squash = clamp(s.squash + s.squashV * dt, -0.14, 0.16);

      // ---------- body springs ----------
      const fwdV = (s.v * s.face) / MAX_V;
      const fwdA = (s.a * s.face) / ACCEL;
      const leanTarget = fwdV * 6 + fwdA * 5;
      s.leanV += ((leanTarget - s.lean) * 70 - s.leanV * 11) * dt;
      s.lean += s.leanV * dt;

      // Idle glances
      s.glanceT -= dt;
      if (s.glanceT <= 0) {
        s.glance = s.mode === "idle" ? (Math.random() - 0.5) * 2 : 0;
        s.glanceT = 1.5 + Math.random() * 3;
      }
      const headTarget = -s.lean * 0.45 + s.glance * 3 + Math.sin(s.t * 1.3) * 0.6 * (1 - g);
      s.headV += ((headTarget - s.head) * 90 - s.headV * 9) * dt;
      s.head += s.headV * dt;

      s.antV += (-s.ant * 110 - s.antV * 5 - fwdA * 1400 - s.headV * 2) * dt;
      s.ant = clamp(s.ant + s.antV * dt, -40, 40);

      // ---------- eyes ----------
      s.blinkT -= dt;
      if (s.blinkT <= 0) {
        s.blink = 0.13;
        s.blinkT = 2 + Math.random() * 4;
        if (Math.random() < 0.2) s.blinkT = 0.25; // occasional double blink
      }
      s.blink = Math.max(0, s.blink - dt);
      const cxScreen = innerWidth - 16 - svgW / 2 + s.x;
      const cyScreen = innerHeight - 12 - svgH * 0.72;
      const recent = performance.now() - pointer.at < 4000;
      const pdx = pointer.x - cxScreen;
      const pdy = pointer.y - cyScreen;
      let lx = 0.6 * g + s.glance * 0.8 * (1 - g);
      let ly = 0;
      if (recent && Math.hypot(pdx, pdy) < 420) {
        lx = clamp((pdx / 160) * s.face, -1, 1);
        ly = clamp(pdy / 160, -1, 1);
      }
      s.lookX += (lx - s.lookX) * Math.min(1, dt * 10);
      s.lookY += (ly - s.lookY) * Math.min(1, dt * 10);

      // ---------- pose ----------
      const breathe = Math.sin(s.t * 2.2) * 0.45 * (1 - g);
      const bob = BOB * (1 - Math.abs(Math.sin(2 * Math.PI * s.phase))) * g * (0.5 + 0.5 * rr);
      const hipY = HIP0 + bob + s.jumpY;
      const tuck = Math.min(0, s.jumpY) * 0.65; // feet rise less than body: legs extend in air

      const wr = wrap.current;
      if (wr) wr.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
      const sq = s.squash;
      r.root.current?.setAttribute(
        "transform",
        `translate(${CX} ${GY}) scale(${(1 + sq * 0.6).toFixed(4)} ${(1 - sq).toFixed(4)}) translate(${-CX} ${-GY})`
      );
      // Pseudo-3D turn: scale through a narrow side-on pose instead of a flat 0
      const fs = Math.sign(s.f) * Math.max(0.3, Math.abs(s.f)) || 0.3;
      r.face.current?.setAttribute("transform", `translate(${CX} 0) scale(${fs.toFixed(3)} 1) translate(${-CX} 0)`);

      const torsoT = `translate(0 ${(hipY - HIP0 + breathe).toFixed(2)}) rotate(${s.lean.toFixed(2)} ${CX} ${HIP0})`;
      r.torso.current?.setAttribute("transform", torsoT);
      r.backLayer.current?.setAttribute("transform", torsoT);
      r.frontLayer.current?.setAttribute("transform", torsoT);
      r.head.current?.setAttribute("transform", `rotate(${s.head.toFixed(2)} ${CX} ${NECK})`);

      // Antenna (pendulum)
      const ab = { x: CX - 2, y: NECK - 25 };
      const aa = (s.ant * Math.PI) / 180;
      const tipX = ab.x + Math.sin(aa) * 9;
      const tipY = ab.y - Math.cos(aa) * 9;
      for (const el of [r.antenna.current, r.antennaO.current]) {
        el?.setAttribute("x2", tipX.toFixed(2));
        el?.setAttribute("y2", tipY.toFixed(2));
      }
      r.tip.current?.setAttribute("cx", tipX.toFixed(2));
      r.tip.current?.setAttribute("cy", tipY.toFixed(2));
      r.tip.current?.setAttribute("opacity", (0.65 + 0.35 * Math.sin(s.t * 3)).toFixed(2));
      r.chest.current?.setAttribute("opacity", (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(s.t * 2.2))).toFixed(2));

      const eyeScale = s.blink > 0 ? 0.12 : 1;
      r.eyes.current?.setAttribute(
        "transform",
        `translate(${(s.lookX * 2.2).toFixed(2)} ${(s.lookY * 1.4 + 26.5).toFixed(2)}) scale(1 ${eyeScale}) translate(0 -26.5)`
      );

      // Arms counter-swing the legs; they hang plumb rather than following the lean
      const swing = 26 * g * (0.4 + 0.6 * rr) * Math.cos(2 * Math.PI * s.phase);
      const idleSway = Math.sin(s.t * 1.7) * 2 * (1 - g);
      const armF = swing - s.lean * 0.8 + idleSway;
      const armB = -swing - s.lean * 0.8 - idleSway;
      r.armF.current?.setAttribute("transform", `rotate(${armF.toFixed(2)} ${CX} ${SHOULDER})`);
      r.armB.current?.setAttribute("transform", `rotate(${armB.toFixed(2)} ${CX} ${SHOULDER})`);
      const fore = (a: number) => -12 - Math.max(0, -a) * 0.9; // elbow bends more on the forward swing
      r.foreF.current?.setAttribute("transform", `rotate(${fore(armF).toFixed(2)} ${CX} ${SHOULDER + 9})`);
      r.foreB.current?.setAttribute("transform", `rotate(${fore(armB).toFixed(2)} ${CX} ${SHOULDER + 9})`);

      // Legs
      const leg = (hx: number, off: number, o: SVGPathElement | null, f: SVGPathElement | null, k: SVGCircleElement | null, ft: SVGRectElement | null) => {
        const [fx, fy, tilt] = foot(off);
        const ax = hx + fx;
        const ay = GY - 2.5 + fy + tuck;
        const [kx, ky] = knee(hx, hipY, ax, ay);
        const d = `M${hx} ${hipY.toFixed(2)}L${kx.toFixed(2)} ${ky.toFixed(2)}L${ax.toFixed(2)} ${ay.toFixed(2)}`;
        o?.setAttribute("d", d);
        f?.setAttribute("d", d);
        k?.setAttribute("cx", kx.toFixed(2));
        k?.setAttribute("cy", ky.toFixed(2));
        ft?.setAttribute("transform", `translate(${ax.toFixed(2)} ${ay.toFixed(2)}) rotate(${tilt.toFixed(2)})`);
      };
      leg(CX - 2, 0.5, r.legBo.current, r.legB.current, r.kneeB.current, r.footB.current);
      leg(CX + 2, 0, r.legFo.current, r.legF.current, r.kneeF.current, r.footF.current);

      const air = clamp(-s.jumpY / 12, 0, 1);
      r.shadow.current?.setAttribute("rx", (15 * (1 - air * 0.35) * (1 + g * 0.08)).toFixed(2));
      r.shadow.current?.setAttribute("opacity", (0.35 * (1 - air * 0.5)).toFixed(2));
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      raf = requestAnimationFrame(loop);
    };
    if (reduced) step(0);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  const arm = (ref: React.RefObject<SVGGElement | null>, foreRef: React.RefObject<SVGGElement | null>, back: boolean) => (
    <g ref={ref} className={back ? "r-back" : undefined}>
      <line x1={CX} y1={SHOULDER} x2={CX} y2={SHOULDER + 9} className="r-limb-o" />
      <line x1={CX} y1={SHOULDER} x2={CX} y2={SHOULDER + 9} className="r-limb" />
      <g ref={foreRef}>
        <line x1={CX} y1={SHOULDER + 9} x2={CX} y2={SHOULDER + 17} className="r-limb-o" />
        <line x1={CX} y1={SHOULDER + 9} x2={CX} y2={SHOULDER + 17} className="r-limb" />
        <circle cx={CX} cy={SHOULDER + 18.5} r="2.8" className="r-hand" />
      </g>
      <circle cx={CX} cy={SHOULDER} r="2.6" className="r-joint" />
    </g>
  );

  const legEls = (
    o: React.RefObject<SVGPathElement | null>,
    f: React.RefObject<SVGPathElement | null>,
    k: React.RefObject<SVGCircleElement | null>,
    ft: React.RefObject<SVGRectElement | null>,
    back: boolean
  ) => (
    <g className={back ? "r-back" : undefined}>
      <path ref={o} className="r-limb-o" />
      <path ref={f} className="r-limb" />
      <circle ref={k} r="2.2" className="r-joint" />
      <rect ref={ft} x="-4" y="-2" width="11.5" height="4.5" rx="2.2" className="r-foot" />
    </g>
  );

  return (
    <div className="robo-walker" ref={wrap}>
      {children}
      <button ref={buttonRef} className="robo-btn" aria-label={label} aria-expanded={expanded} onClick={() => {
        hopRef.current();
        onActivate();
      }}>
        <svg ref={svg} className="robo-svg" viewBox="0 0 80 100" aria-hidden="true">
          <ellipse ref={r.shadow} cx={CX} cy={GY + 1.5} rx="15" ry="2.6" className="r-shadow" />
          <g ref={r.root}>
            <g ref={r.face}>
              <g ref={r.backLayer}>{arm(r.armB, r.foreB, true)}</g>
              {legEls(r.legBo, r.legB, r.kneeB, r.footB, true)}
              <g ref={r.torso}>
                <rect x={CX - 12} y={HIP0 - 27} width="24" height="28" rx="7" className="r-body" />
                <rect x={CX - 12} y={HIP0 - 4} width="24" height="5" rx="2.5" className="r-belt" />
                <rect ref={r.chest} x={CX - 1} y={HIP0 - 19} width="8" height="4.5" rx="2" className="r-accent" />
                <g ref={r.head}>
                  <rect x={CX - 3} y={NECK - 2} width="6" height="4" className="r-belt" />
                  <line ref={r.antennaO} x1={CX - 2} y1={NECK - 25} x2={CX - 2} y2={NECK - 34} className="r-ant-o" />
                  <line ref={r.antenna} x1={CX - 2} y1={NECK - 25} x2={CX - 2} y2={NECK - 34} className="r-ant" />
                  <circle ref={r.tip} cx={CX - 2} cy={NECK - 34} r="2.8" className="r-accent" />
                  <rect x={CX - 17} y={NECK - 25} width="34" height="24" rx="8" className="r-body" />
                  <circle cx={CX - 11} cy={NECK - 12} r="3" className="r-joint" />
                  <rect x={CX - 7} y={NECK - 19.5} width="22" height="12" rx="5.5" className="r-visor" />
                  <g ref={r.eyes}>
                    <ellipse cx={CX + 0.5} cy="26.5" rx="2.3" ry="2.7" className="r-eye" />
                    <ellipse cx={CX + 8.5} cy="26.5" rx="2.3" ry="2.7" className="r-eye" />
                  </g>
                </g>
              </g>
              {legEls(r.legFo, r.legF, r.kneeF, r.footF, false)}
              <g ref={r.frontLayer}>{arm(r.armF, r.foreF, false)}</g>
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}
