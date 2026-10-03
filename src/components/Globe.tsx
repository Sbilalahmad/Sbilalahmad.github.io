import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { hexToRgb01, useCssVars, useInView, useReducedMotion, useTheme } from "../hooks";

const ALIGARH: [number, number] = [27.8974, 78.088];
const GURUGRAM: [number, number] = [28.4595, 77.0266];

// cobe's phi that puts a given longitude front and centre
const phiFor = (lon: number) => Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2);

/** Dotted, draggable globe pinned on Aligarh. */
export default function Globe() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [wrapRef, visible] = useInView<HTMLDivElement>({ once: false });
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const c = useCssVars(["--accent"] as const);
  const drag = useRef<{ x: number; phi: number } | null>(null);
  const phi = useRef(phiFor(ALIGARH[1]) - 0.6);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !visible) return;
    // cobe wraps the canvas in its own div and never unwraps it, so keep that
    // DOM out of React's tree: create it here and remove it on cleanup.
    const canvas = document.createElement("canvas");
    host.append(canvas);
    const size = host.offsetWidth;
    const dark = theme === "dark";
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: phi.current,
      theta: 0.32,
      dark: dark ? 1 : 0,
      diffuse: dark ? 1.4 : 1.1,
      mapSamples: 16000,
      mapBrightness: dark ? 5 : 9,
      mapBaseBrightness: dark ? 0 : 0.02,
      baseColor: dark ? [0.2, 0.2, 0.2] : [0.95, 0.96, 0.98],
      markerColor: hexToRgb01(c["--accent"]),
      glowColor: dark ? hexToRgb01("#000000") : [1, 1, 1],
      markers: [
        { location: ALIGARH, size: 0.07 },
        { location: GURUGRAM, size: 0.04 },
      ],
    });

    let raf = 0;
    const loop = () => {
      if (!drag.current && !reduced) phi.current += 0.0035;
      globe.update({ phi: phi.current });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    canvas.style.opacity = "1";
    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      host.replaceChildren();
    };
  }, [visible, theme, c, reduced]);

  return (
    <div className="globe" ref={wrapRef}>
      <div
        ref={hostRef}
        className="globe-host"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, phi: phi.current };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) phi.current = drag.current.phi + (e.clientX - drag.current.x) / 180;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        aria-label="Globe showing my location in Aligarh, India. Drag to rotate."
        role="img"
      />
      <p className="globe-cap mono">
        <span className="dot" /> Aligarh, India · interned in Gurugram
      </p>
    </div>
  );
}
