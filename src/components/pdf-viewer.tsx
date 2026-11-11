"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { assetUrl } from "@/lib/portfolio";
import dynamic from "next/dynamic";
import PdfPageInput from "./pdf-page-input";

const PdfFullscreen = dynamic(() => import("./pdf-fullscreen"), { ssr: false });

export default function PdfViewer({ src, title }: { src: string; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(800);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const cache = useRef<{ render: (page: number) => Promise<HTMLCanvasElement>; trim: (page: number) => void } | null>(null);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    setDocument(undefined); setPage(1); setError(""); setBusy(true); setHasFrame(false);
    void Promise.all([import("pdfjs-dist"), fetch(src, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("PDF request failed");
      return response.arrayBuffer();
    })]).then(([pdf, bytes]) => {
      if (disposed) return;
      pdf.GlobalWorkerOptions.workerSrc = assetUrl("/pdfjs/pdf.worker.min.mjs");
      loading = pdf.getDocument({ data: new Uint8Array(bytes), cMapUrl: assetUrl("/pdfjs/cmaps/"), cMapPacked: true, standardFontDataUrl: assetUrl("/pdfjs/standard_fonts/"), wasmUrl: assetUrl("/pdfjs/wasm/") });
      return loading.promise.then(value => {
        if (disposed) return;
        setDocument(value);
        void (async () => { for (let number = 1; number <= value.numPages && !disposed; number++) await value.getPage(number); })().catch(() => {});
      });
    }).catch(() => { if (!disposed) { setError("문서를 불러오지 못했습니다. 페이지를 새로고침해 주세요."); setBusy(false); } });
    return () => { disposed = true; controller.abort(); void loading?.destroy(); };
  }, [src]);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(160, entries[0].contentRect.width)));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!document) { cache.current = null; return; }
    const frames = new Map<number, Promise<HTMLCanvasElement>>();
    const tasks = new Set<ReturnType<import("pdfjs-dist").PDFPageProxy["render"]>>();
    let closed = false;
    const render = (number: number): Promise<HTMLCanvasElement> => {
      const existing = frames.get(number);
      if (existing) return existing;
      const pending = (async () => {
        const pdfPage = await document.getPage(number);
        if (closed) throw new Error("Viewer closed");
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: width / base.width * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const buffer = window.document.createElement("canvas");
        buffer.width = Math.floor(viewport.width * ratio);
        buffer.height = Math.floor(viewport.height * ratio);
        buffer.style.width = `${viewport.width}px`;
        buffer.style.height = `${viewport.height}px`;
        const task = pdfPage.render({ canvas: buffer, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        tasks.add(task);
        try { await task.promise; } finally { tasks.delete(task); }
        return buffer;
      })();
      frames.set(number, pending);
      void pending.catch(() => { if (frames.get(number) === pending) frames.delete(number); });
      return pending;
    };
    cache.current = { render, trim: current => { for (const number of frames.keys()) if (number < current - 2 || number > current + 2) frames.delete(number); } };
    return () => { closed = true; tasks.forEach(task => task.cancel()); frames.clear(); cache.current = null; };
  }, [document, width, zoom]);

  useEffect(() => {
    const prepared = cache.current;
    if (!document || !canvas.current || !prepared) return;
    let disposed = false;
    setBusy(true); setError(""); prepared.trim(page);
    void prepared.render(page).then(buffer => {
      if (disposed || !canvas.current) return;
      const element = canvas.current;
      element.width = buffer.width; element.height = buffer.height;
      element.style.width = buffer.style.width; element.style.height = buffer.style.height;
      element.getContext("2d")!.drawImage(buffer, 0, 0);
      setHasFrame(true); setBusy(false);
      void (async () => {
        for (const number of [page + 1, page + 2, page - 1]) {
          if (disposed) return;
          if (number > 0 && number <= document.numPages) await prepared.render(number);
        }
      })().catch(() => {});
    }).catch(() => { if (!disposed) { setError("페이지 표시 중 문제가 발생했습니다. 다시 시도해 주세요."); setBusy(false); } });
    return () => { disposed = true; };
  }, [document, page, width, zoom]);

  return <section className="pdf-viewer" aria-label={`${title} 문서 보기`} tabIndex={0} onKeyDown={event => {
    if ((event.target as HTMLElement).tagName === "SELECT" || !document) return;
    if (event.key === "ArrowRight") { event.preventDefault(); setPage(value => Math.min(document.numPages, value + 1)); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setPage(value => Math.max(1, value - 1)); }
  }}>
    <div className="pdf-stage" ref={frame} aria-busy={busy}>
      <canvas ref={canvas} role="img" aria-label={`${title} ${page}페이지`} />
    </div>
    {((busy && !hasFrame) || error) && <p className="pdf-status" role="status">{error || "문서를 불러오는 중…"}</p>}
    <button className="pdf-turn pdf-turn-prev" disabled={!document || page === 1} onClick={() => setPage(value => value - 1)} aria-label="이전 페이지">‹</button>
    <button className="pdf-turn pdf-turn-next" disabled={!document || page === document.numPages} onClick={() => setPage(value => value + 1)} aria-label="다음 페이지">›</button>
    <div className="pdf-toolbar">
      <div className="pdf-page-controls">
        <label>페이지 <PdfPageInput page={page} total={document?.numPages} onChange={setPage} label="PDF 페이지 번호" /> / {document?.numPages || "…"}</label>
      </div>
      <div className="pdf-zoom-controls">
        <button disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .25))} aria-label="축소">−</button>
        <button onClick={() => setZoom(1)} aria-label="화면 너비에 맞춤">{Math.round(zoom * 100)}%</button>
        <button disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .25))} aria-label="확대">+</button>
        <button disabled={!document} onClick={() => setFullscreen(true)} aria-label="전체화면 보기"><span aria-hidden="true">⛶</span> 전체화면</button>
      </div>
    </div>
    {fullscreen && document && <PdfFullscreen pdf={document} title={title} initialPage={page} onClose={() => setFullscreen(false)} />}
  </section>;
}
