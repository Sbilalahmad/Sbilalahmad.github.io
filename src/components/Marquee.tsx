/** Infinite horizontal scroller (Magic UI "Marquee" pattern); pauses on hover. */
export default function Marquee({ items, reverse = false, duration = 40 }: { items: string[]; reverse?: boolean; duration?: number }) {
  return (
    <div className={`marquee ${reverse ? "reverse" : ""}`} style={{ ["--dur" as string]: `${duration}s` }}>
      {[0, 1].map((copy) => (
        <ul key={copy} className="marquee-track" aria-hidden={copy === 1}>
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}
