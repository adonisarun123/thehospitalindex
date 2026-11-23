"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { group: string; label: string; sub?: string | null; href?: string; value?: string; id?: string };

const MIN_CHARS = 2; // SRH-02
const DEBOUNCE_MS = 160;

/**
 * SRH-01: an accessible combobox. Works as a plain text input when
 * JavaScript is unavailable; Enter always submits the typed text.
 */
function Combobox({
  name,
  label,
  placeholder,
  kind,
  defaultValue,
  onPick,
}: {
  name: string;
  label: string;
  placeholder: string;
  kind: "what" | "where";
  defaultValue?: string;
  onPick: (s: Suggestion | null) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    abort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function query(text: string) {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort(); // SRH-02: cancel stale requests
    if (text.trim().length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setStatus("");
      return;
    }
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/api/v1/suggest?kind=${kind}&q=${encodeURIComponent(text.trim())}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items);
        setActive(-1);
        setOpen(data.items.length > 0);
        setStatus(data.items.length ? `${data.items.length} suggestions` : "No suggestions");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setItems([]);
          setOpen(false);
          setStatus("Suggestions are unavailable. You can still search.");
        }
      }
    }, DEBOUNCE_MS);
  }

  function pick(s: Suggestion) {
    setOpen(false);
    if (s.href && kind === "what") {
      router.push(s.href);
      return;
    }
    setValue(s.value ?? s.label);
    onPick(s);
  }

  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="search"
        className="field"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onPick(null);
          query(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onFocus={() => items.length > 0 && setOpen(true)}
      />
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!open}
        className="card absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-auto py-1"
      >
        {items.map((s, i) => {
          const header = s.group !== items[i - 1]?.group ? s.group : null;
          return (
            <li key={`${s.group}-${s.label}-${s.sub ?? ""}-${i}`} role="presentation">
              {header ? (
                <div role="presentation" className="meta px-3 pt-2 pb-1 font-semibold uppercase tracking-wide">
                  {header}
                </div>
              ) : null}
              <div
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 ${i === active ? "bg-teal-tint" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{s.label}</span>
                {s.sub ? <span className="meta">{s.sub}</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}

export function SearchBox({ q, where, geo }: { q?: string; where?: string; geo?: string }) {
  const [geoId, setGeoId] = useState(geo ?? "");
  return (
    <form action="/search" method="get" role="search" aria-label="Find a hospital" className="card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Combobox
          name="q"
          kind="what"
          label="Hospital, specialty or service"
          placeholder="e.g. dialysis, cardiology"
          defaultValue={q}
          onPick={() => {}}
        />
        <Combobox
          name="where"
          kind="where"
          label="City, locality or PIN"
          placeholder="e.g. Bengaluru or 560102"
          defaultValue={where}
          onPick={(s) => setGeoId(s?.id ?? "")}
        />
        {geoId ? <input type="hidden" name="geo" value={geoId} /> : null}
        <button type="submit" className="btn-primary md:w-auto">
          Search
        </button>
      </div>
    </form>
  );
}
