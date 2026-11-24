"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FRAMEWORKS,
  GRADES,
  frameworkLabel,
  gradeLabel,
  normalizeQuery,
  type StandardResult,
  type StandardTag,
} from "@/lib/standards";

const FILTERS_KEY = "signalslate.standardsFilters";

interface StandardsPickerProps {
  value: StandardTag[];
  onChange: (tags: StandardTag[]) => void;
  max?: number;
}

type Option = { kind: "standard"; result: StandardResult } | { kind: "custom"; code: string };

/** Search official standards (or add a custom code) and keep them as chips. */
export function StandardsPicker({ value, onChange, max = 6 }: StandardsPickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState("");
  const [grade, setGrade] = useState("");
  // Results and the search they answer, so stale results are never shown
  const [results, setResults] = useState<{ key: string; rows: StandardResult[] }>({ key: "", rows: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Remember the filters between tickets
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "{}");
      /* eslint-disable react-hooks/set-state-in-effect -- reading localStorage after hydration */
      if (FRAMEWORKS.includes(saved.framework)) setFramework(saved.framework);
      if (GRADES.includes(saved.grade)) setGrade(saved.grade);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // ignore unreadable saved filters
    }
  }, []);

  function saveFilters(next: { framework: string; grade: string }) {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      // storage can be unavailable; filters just won't be remembered
    }
  }

  const trimmed = query.trim();
  const searchable = normalizeQuery(trimmed).length >= 2;
  const searchKey = JSON.stringify([trimmed, framework, grade]);
  const ready = results.key === searchKey;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (framework) params.set("framework", framework);
        if (grade) params.set("grade", grade);
        const res = await fetch(`/api/standards?${params}`, { signal: controller.signal });
        const rows: StandardResult[] = res.ok ? await res.json() : [];
        setResults({ key: searchKey, rows });
        setActive(0);
      } catch {
        // aborted by a newer search, or offline
        if (!controller.signal.aborted) setResults({ key: searchKey, rows: [] });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, framework, grade, searchable, searchKey]);

  const chosenIds = new Set(value.map((t) => t.standardId).filter(Boolean));
  const chosenCodes = new Set(value.filter((t) => t.framework).map((t) => `${t.framework}|${t.code}`));
  const chosenCustom = new Set(value.filter((t) => !t.standardId).map((t) => t.code.toLowerCase()));
  const shown = searchable && ready ? results.rows.filter((r) => !chosenIds.has(r.id) && !chosenCodes.has(`${r.framework}|${r.code}`)) : [];
  const exactCode = shown.some((r) => r.code.toLowerCase() === trimmed.toLowerCase());
  const options: Option[] = [
    ...shown.map((result) => ({ kind: "standard" as const, result })),
    // Offer custom text only once the search is back, so Enter can't grab it early
    ...(trimmed && (ready || !searchable) && !exactCode && !chosenCustom.has(trimmed.toLowerCase())
      ? [{ kind: "custom" as const, code: trimmed.slice(0, 80) }]
      : []),
  ];
  const full = value.length >= max;
  const listOpen = open && !!trimmed && !full;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  function choose(option: Option) {
    const tag: StandardTag =
      option.kind === "standard"
        ? {
            standardId: option.result.id,
            code: option.result.code,
            framework: option.result.framework,
            description: option.result.description,
          }
        : { standardId: null, code: option.code };
    onChange([...value, tag]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((activeIndex + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((activeIndex - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      // Never submit the ticket form from the search box
      e.preventDefault();
      if (listOpen && options[activeIndex]) choose(options[activeIndex]);
    } else if (e.key === "Escape" && listOpen) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value.length - 1);
    }
  }

  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const selectClass =
    "h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen standards">
          {value.map((tag, i) => (
            <li
              key={tag.standardId ?? `custom-${tag.code}`}
              title={tag.description}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-0.5 pl-2 pr-1 text-sm"
            >
              <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">
                {tag.framework ? frameworkLabel(tag.framework) : "Custom"}
              </span>
              <span className="font-mono text-xs text-slate-900">{tag.code}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${tag.code}`}
                className="rounded px-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`${id}-framework`}>
          Framework
        </label>
        <select
          id={`${id}-framework`}
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value);
            saveFilters({ framework: e.target.value, grade });
          }}
          className={selectClass}
        >
          <option value="">All frameworks</option>
          {FRAMEWORKS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-grade`}>
          Grade
        </label>
        <select
          id={`${id}-grade`}
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            saveFilters({ framework, grade: e.target.value });
          }}
          className={selectClass}
        >
          <option value="">Any grade</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g === "K" ? "Kindergarten" : `Grade ${g}`}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id="standards"
          type="text"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listOpen && options.length ? optionId(activeIndex) : undefined}
          aria-describedby={`${id}-help`}
          autoComplete="off"
          disabled={full}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder={full ? `Up to ${max} standards` : "Search by code or topic, e.g. 6.RP.A.1 or unit rate"}
          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {listOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching standards"
            className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            {!searchable && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">Keep typing to search…</li>
            )}
            {searchable && !ready && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
            {searchable && ready && shown.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">No matching standards.</li>
            )}
            {options.map((option, i) => (
              <li
                key={option.kind === "standard" ? option.result.id : "custom"}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === activeIndex ? "bg-slate-100" : ""} ${
                  option.kind === "custom" ? "border-t border-slate-100 text-slate-700" : ""
                }`}
              >
                {option.kind === "standard" ? (
                  <>
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-medium text-slate-900">{option.result.code}</span>
                      <span className="text-xs text-slate-500">
                        {option.result.framework} · {option.result.subject} · {gradeLabel(option.result.grade)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-slate-600">{option.result.description}</span>
                  </>
                ) : (
                  <>
                    Use <span className="font-mono text-xs font-medium">“{option.code}”</span> as a custom standard
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={`${id}-help`} className="text-xs text-slate-500">
        Common Core, NGSS and California standards from the Achievement Standards Network (ASN), © D2L
        Corporation,{" "}
        <a
          href="http://creativecommons.org/licenses/by/3.0/us/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-600"
        >
          CC BY 3.0 US
        </a>
        .
      </p>
    </div>
  );
}
