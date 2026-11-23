import Link from "next/link";
import type { Block } from "@/content/types";

const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** Renders the two inline marks editorial content may use: [text](href) and **bold**. */
export function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    if (m[1] !== undefined) {
      const href = m[2];
      out.push(
        href.startsWith("/") ? (
          <Link key={i} href={href} className="link">
            {m[1]}
          </Link>
        ) : (
          <a key={i} href={href} className="link" rel="noopener" target="_blank">
            {m[1]}
          </a>
        ),
      );
    } else {
      out.push(<strong key={i}>{m[3]}</strong>);
    }
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} id={b.id}>
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-5 mb-2 font-semibold">
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const Tag = b.type;
            return (
              <Tag key={i} className={b.type === "ol" ? "mb-4 list-decimal space-y-1.5 pl-6" : "space-y-1.5"}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "callout":
            return (
              <aside
                key={i}
                role="note"
                className={`my-6 rounded-xl border p-4 ${b.tone === "warning" ? "border-amber-ink/40 bg-amber-tint text-amber-ink" : "border-teal/30 bg-teal-tint"}`}
              >
                {b.title ? <p className="mb-1 font-semibold">{b.title}</p> : null}
                <p className="mb-0">
                  <Inline text={b.text} />
                </p>
              </aside>
            );
        }
      })}
    </>
  );
}
