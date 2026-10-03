import type { ComponentType, CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "../hooks";

// Polymorphic `as` prop: loosen the type so any tag/component can be rendered
type AnyTag = ComponentType<Record<string, unknown>>;

/** Fades/slides children in when they enter the viewport. */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: { as?: ElementType; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.12 });
  const Comp = Tag as AnyTag;
  return (
    <Comp
      ref={ref}
      className={`reveal ${inView ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Card that highlights its border on hover. */
export function SpotlightCard({
  as: Tag = "article",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const Comp = Tag as AnyTag;
  return (
    <Comp className={`spotlight ${className}`}>
      {children}
    </Comp>
  );
}
