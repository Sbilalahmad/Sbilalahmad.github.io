import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

export const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function useThemeState() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || "dark"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}

/** Reads CSS custom properties; re-reads whenever the theme changes. */
export function useCssVars<K extends string>(names: readonly K[]): Record<K, string> {
  const { theme } = useTheme();
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()])) as Record<K, string>;
  };
  const [vals, setVals] = useState(read);
  useEffect(() => setVals(read()), [theme]);
  return vals;
}

/** "#c9a96e" -> [0.79, 0.66, 0.43] */
export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True once the element has scrolled into view (or continuously, with once=false). */
export function useInView<T extends Element>(options: IntersectionObserverInit & { once?: boolean } = {}) {
  const { once = true, ...io } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) obs.disconnect();
      } else if (!once) {
        setInView(false);
      }
    }, io);
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);
  return [ref, inView] as const;
}
