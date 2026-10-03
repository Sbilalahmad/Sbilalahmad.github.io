import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCssVars, useInView, useReducedMotion } from "../hooks";

/*
 * A brain-shaped point cloud wired up as a neural graph. Signals ("pulses")
 * hop node-to-node along synapses and light up the neurons they reach.
 * Clicking fires a burst of extra signals — a little brainstorm.
 */

type Graph = { positions: Float32Array; edges: Uint32Array; adj: number[][]; count: number };

type Pulse = { a: number; b: number; t: number; speed: number; hops: number; burst: boolean };

const BASE_PULSES = 46;
const MAX_PULSES = 260;
// Burst signals may only use the capacity left over after the ambient ones,
// so rapid clicking can never starve the ambient top-up below.
const MAX_BURST = MAX_PULSES - BASE_PULSES;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBrain(n: number): Graph {
  const rand = mulberry32(42);
  const pts: number[] = [];

  while (pts.length / 3 < n) {
    // Random direction on the unit sphere
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    let x = s * Math.cos(th);
    let y = u;
    let z = s * Math.sin(th);

    const cerebellum = rand() < 0.08;
    const shell = rand() < 0.8;

    if (cerebellum) {
      const r = 0.28 * (shell ? 1 : rand());
      pts.push(-0.72 + x * r * 1.2, -0.48 + y * r * 0.7, z * r * 1.5);
      continue;
    }

    // Cortex folds: wobble the radius so the surface reads as gyri
    const r = shell ? 1 + 0.08 * Math.sin(9 * x + 1) * Math.sin(8 * y) * Math.sin(7 * z + 2) : 0.3 + rand() * 0.55;
    x *= r;
    y *= r;
    z *= r;

    // Longitudinal fissure between the hemispheres
    if (shell && Math.abs(z) < 0.07) continue;
    const side = Math.sign(z) || 1;

    x *= 1.18; // front-to-back is the long axis
    y *= 0.84;
    z = z * 0.86 + side * 0.06;
    if (y < -0.2) y = -0.2 + (y + 0.2) * 0.55; // flatter base
    pts.push(x, y, z);
  }

  const positions = new Float32Array(pts);
  const count = positions.length / 3;

  // Connect each neuron to its nearest neighbours
  const K = 3;
  const MAX_D2 = 0.32 * 0.32;
  const seen = new Set<number>();
  const edgeList: number[] = [];
  const adj: number[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < count; i++) {
    const best: [number, number][] = [];
    const ix = positions[i * 3], iy = positions[i * 3 + 1], iz = positions[i * 3 + 2];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = positions[j * 3] - ix, dy = positions[j * 3 + 1] - iy, dz = positions[j * 3 + 2] - iz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > MAX_D2) continue;
      if (best.length < K) {
        best.push([d2, j]);
        best.sort((p, q) => p[0] - q[0]);
      } else if (d2 < best[K - 1][0]) {
        best[K - 1] = [d2, j];
        best.sort((p, q) => p[0] - q[0]);
      }
    }
    for (const [, j] of best) {
      const key = i < j ? i * count + j : j * count + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edgeList.push(i, j);
      adj[i].push(j);
      adj[j].push(i);
    }
  }

  return { positions, edges: new Uint32Array(edgeList), adj, count };
}

function circleTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type BrainProps = {
  nodeColor: string;
  lineColor: string;
  accent: string;
  animate: boolean;
  burstRef: { current: number };
};

function Brain({ nodeColor, lineColor, accent, animate, burstRef }: BrainProps) {
  const isSmall = typeof window !== "undefined" && window.innerWidth < 760;
  const graph = useMemo(() => buildBrain(isSmall ? 650 : 1100), [isSmall]);
  const group = useRef<THREE.Group>(null!);
  const baseY = useRef(0);

  const { nodes, lines, pulsePoints, energy, colorAttr, pulseAttr } = useMemo(() => {
    const tex = circleTexture();

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(graph.positions, 3));
    const colorAttr = new THREE.BufferAttribute(new Float32Array(graph.count * 3), 3);
    nodeGeo.setAttribute("color", colorAttr);
    const nodes = new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({ size: 0.032, vertexColors: true, map: tex, alphaTest: 0.4, sizeAttenuation: true })
    );

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(graph.positions, 3));
    lineGeo.setIndex(new THREE.BufferAttribute(graph.edges, 1));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false })
    );

    const pulseGeo = new THREE.BufferGeometry();
    const pulseAttr = new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 3), 3);
    pulseGeo.setAttribute("position", pulseAttr);
    pulseGeo.setDrawRange(0, 0);
    const pulsePoints = new THREE.Points(
      pulseGeo,
      new THREE.PointsMaterial({ size: 0.07, map: tex, alphaTest: 0.4, sizeAttenuation: true })
    );

    return { nodes, lines, pulsePoints, energy: new Float32Array(graph.count), colorAttr, pulseAttr };
  }, [graph]);

  const base = useMemo(() => new THREE.Color(), []);
  const hot = useMemo(() => new THREE.Color(), []);

  const paintNodes = () => {
    const arr = colorAttr.array as Float32Array;
    for (let i = 0; i < graph.count; i++) {
      const e = energy[i];
      arr[i * 3] = base.r + (hot.r - base.r) * e;
      arr[i * 3 + 1] = base.g + (hot.g - base.g) * e;
      arr[i * 3 + 2] = base.b + (hot.b - base.b) * e;
    }
    colorAttr.needsUpdate = true;
  };

  // Theme colours
  useEffect(() => {
    base.set(nodeColor);
    hot.set(accent);
    (lines.material as THREE.LineBasicMaterial).color.set(lineColor);
    (pulsePoints.material as THREE.PointsMaterial).color.set(accent);
    paintNodes();
  }, [nodeColor, lineColor, accent]);

  // Free GPU resources on unmount
  useEffect(
    () => () => {
      for (const o of [nodes, lines, pulsePoints]) {
        o.geometry.dispose();
        const m = o.material as THREE.PointsMaterial;
        m.map?.dispose();
        m.dispose();
      }
    },
    [nodes, lines, pulsePoints]
  );

  const pulses = useRef<Pulse[]>([]);
  const rand = useMemo(() => mulberry32(7), []);

  /** Adds a signal starting at `from`; returns false if it couldn't. */
  const spawn = (from: number, burst: boolean) => {
    const nbrs = graph.adj[from];
    if (!nbrs.length || pulses.current.length >= MAX_PULSES) return false;
    pulses.current.push({
      a: from,
      b: nbrs[Math.floor(rand() * nbrs.length)],
      t: 0,
      speed: 1.6 + rand() * 2.2,
      hops: burst ? 4 + Math.floor(rand() * 6) : 6 + Math.floor(rand() * 14),
      burst,
    });
    return true;
  };

  useFrame((state, dt) => {
    if (!animate) return;
    dt = Math.min(dt, 0.05);
    const g = group.current;

    // Slow idle spin plus a gentle look toward the cursor
    baseY.current += dt * 0.12;
    g.rotation.y += (baseY.current + state.pointer.x * 0.5 - g.rotation.y) * 0.05;
    g.rotation.x += (-state.pointer.y * 0.25 - g.rotation.x) * 0.05;

    // Click → brainstorm: a cascade from one region
    if (burstRef.current > 0) {
      burstRef.current = 0;
      const seed = Math.floor(rand() * graph.count);
      const region = [seed, ...graph.adj[seed], ...graph.adj[seed].flatMap((n) => graph.adj[n])];
      const bursting = pulses.current.reduce((n, p) => n + (p.burst ? 1 : 0), 0);
      const room = Math.min(70, MAX_BURST - bursting);
      for (let i = 0; i < room; i++) spawn(region[i % region.length], true);
      energy[seed] = 1;
    }

    // Top up ambient signals. Bounded: an unbounded `while` here froze the
    // page when spawn() kept failing (pool full / isolated node).
    let ambient = pulses.current.reduce((n, p) => n + (p.burst ? 0 : 1), 0);
    for (let tries = 0; ambient < BASE_PULSES && tries < BASE_PULSES * 4; tries++) {
      if (spawn(Math.floor(rand() * graph.count), false)) ambient++;
    }

    const pos = graph.positions;
    const out = pulseAttr.array as Float32Array;
    const alive: Pulse[] = [];
    for (const p of pulses.current) {
      p.t += dt * p.speed;
      if (p.t >= 1) {
        energy[p.b] = 1;
        p.hops--;
        if (p.hops <= 0) continue;
        const nbrs = graph.adj[p.b].filter((n) => n !== p.a);
        if (!nbrs.length) continue;
        p.a = p.b;
        p.b = nbrs[Math.floor(rand() * nbrs.length)];
        p.t = 0;
      }
      alive.push(p);
    }
    pulses.current = alive;
    alive.forEach((p, i) => {
      for (let k = 0; k < 3; k++) out[i * 3 + k] = pos[p.a * 3 + k] + (pos[p.b * 3 + k] - pos[p.a * 3 + k]) * p.t;
    });
    pulseAttr.needsUpdate = true;
    pulsePoints.geometry.setDrawRange(0, alive.length);

    const decay = Math.exp(-dt * 2.2);
    for (let i = 0; i < graph.count; i++) energy[i] *= decay;
    paintNodes();
  });

  return (
    <group ref={group} rotation={[0.15, -0.6, 0]}>
      <primitive object={lines} />
      <primitive object={nodes} />
      <primitive object={pulsePoints} />
    </group>
  );
}

export default function NeuralBrain() {
  const reduced = useReducedMotion();
  const [wrapRef, visible] = useInView<HTMLDivElement>({ once: false, threshold: 0.01 });
  const burstRef = useRef(0);
  const c = useCssVars(["--muted", "--accent"] as const);
  const animate = visible && !reduced;

  return (
    <div
      ref={wrapRef}
      className="brain"
      onPointerDown={() => (burstRef.current = 1)}
      role="img"
      aria-label="Interactive 3D neural network shaped like a brain. Click to trigger a burst of signals."
    >
      <Canvas
        camera={{ position: [0, 0, 3.7], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={animate ? "always" : "demand"}
      >
        <Brain
          nodeColor={c["--muted"]}
          lineColor={c["--muted"]}
          accent={c["--accent"]}
          animate={animate}
          burstRef={burstRef}
        />
      </Canvas>
      <span className="brain-hint mono">click to brainstorm</span>
    </div>
  );
}
