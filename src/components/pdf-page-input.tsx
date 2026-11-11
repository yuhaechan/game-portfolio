"use client";

import { useEffect, useState } from "react";

export default function PdfPageInput({ page, total, onChange, label }: { page: number; total?: number; onChange: (page: number) => void; label: string }) {
  const [value, setValue] = useState(String(page));
  useEffect(() => setValue(String(page)), [page]);
  function commit() {
    const parsed = Number(value);
    const next = value && Number.isFinite(parsed) ? Math.min(total || 1, Math.max(1, Math.trunc(parsed))) : page;
    setValue(String(next));
    if (next !== page) onChange(next);
  }
  return <input className="pdf-page-input" type="text" inputMode="numeric" pattern="[0-9]*" aria-label={label} disabled={!total} value={value} onFocus={event => event.target.select()} onChange={event => setValue(event.target.value.replace(/\D/g, ""))} onBlur={commit} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === "Enter") { event.preventDefault(); commit(); }
    if (event.key === "Escape") { event.preventDefault(); setValue(String(page)); }
  }} />;
}
