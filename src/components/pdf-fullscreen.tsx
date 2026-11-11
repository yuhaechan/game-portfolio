"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import PdfPageInput from "./pdf-page-input";

function Sheet({ pdf, number, thumbnail = false }: { pdf: PDFDocumentProxy; number: number; thumbnail?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!box.current) return;
    const visibility = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: "500px" });
    const size = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    visibility.observe(box.current); size.observe(box.current);
    return () => { visibility.disconnect(); size.disconnect(); };
  }, []);
  useEffect(() => {
    if (!visible || !width || !canvas.current) return;
    let disposed = false;
    let task: ReturnType<PDFPageProxy["render"]> | undefined;
    setFailed(false);
    void pdf.getPage(number).then(page => {
      if (disposed || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      setAspect(base.width / base.height);
      const viewport = page.getViewport({ scale: width / base.width });
      const ratio = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.current.width = Math.floor(viewport.width * ratio);
      canvas.current.height = Math.floor(viewport.height * ratio);
      task = page.render({ canvas: canvas.current, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      return task.promise;
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; task?.cancel(); };
  }, [pdf, number, thumbnail, visible, width]);
  return <div className="pdf-sheet" ref={box} style={{ aspectRatio: aspect }}>
    <canvas ref={canvas} role="img" aria-label={`${number}페이지${thumbnail ? " 미리보기" : ""}`} />
    {failed && <span className="pdf-sheet-error">페이지를 표시하지 못했습니다.</span>}
  </div>;
}

export default function PdfFullscreen({ pdf, title, initialPage, onClose }: { pdf: PDFDocumentProxy; title: string; initialPage: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [sidebar, setSidebar] = useState(true);
  function go(number: number) {
    scroll.current?.querySelector(`[data-pdf-page="${number}"]`)?.scrollIntoView({ block: "start", behavior: "instant" });
    setPage(number);
  }
  useEffect(() => {
    dialog.current?.showModal();
    const previous = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    const root = scroll.current;
    const target = root?.querySelector(`[data-pdf-page="${initialPage}"]`);
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    const observer = new IntersectionObserver(entries => {
      const first = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (first) setPage(Number((first.target as HTMLElement).dataset.pdfPage));
    }, { root, rootMargin: "0px 0px -65% 0px", threshold: 0 });
    root?.querySelectorAll("[data-pdf-page]").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); window.document.body.style.overflow = previous; };
  }, [initialPage]);
  return <dialog className="pdf-fullscreen" ref={dialog} onClose={onClose} aria-label={`${title} 전체화면 문서 보기`}>
    <header className="pdf-fullscreen-header">
      <button onClick={onClose} aria-label="전체화면 닫기">✕</button><h2>{title}</h2>
      <div className="pdf-fullscreen-tools">
        <button onClick={() => setSidebar(value => !value)} aria-label="페이지 미리보기 표시 전환" aria-pressed={sidebar}>☷</button>
        <label>페이지 <PdfPageInput page={page} total={pdf.numPages} onChange={go} label="전체화면 페이지 번호" /> / {pdf.numPages}</label>
        <button disabled={zoom <= .5} onClick={() => setZoom(value => Math.max(.5, value - .25))} aria-label="전체화면 축소">−</button>
        <button onClick={() => setZoom(1)} aria-label="전체화면 너비 맞춤">{Math.round(zoom * 100)}%</button>
        <button disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .25))} aria-label="전체화면 확대">+</button>
      </div>
    </header>
    <div className={`pdf-fullscreen-body${sidebar ? "" : " no-sidebar"}`}>
      {sidebar && <aside className="pdf-thumbnails" aria-label="페이지 미리보기">{Array.from({ length: pdf.numPages }, (_, i) => <button key={i + 1} aria-label={`${i + 1}페이지로 이동`} aria-current={page === i + 1 ? "page" : undefined} onClick={() => go(i + 1)}><span>{i + 1}</span><Sheet pdf={pdf} number={i + 1} thumbnail /></button>)}</aside>}
      <div className="pdf-continuous" ref={scroll} tabIndex={0} aria-label="PDF 문서 스크롤 영역">
        <div className="pdf-continuous-pages" style={{ width: `${zoom * 100}%`, maxWidth: `${1100 * zoom}px` }}>{Array.from({ length: pdf.numPages }, (_, i) => <div key={i + 1} data-pdf-page={i + 1}><Sheet pdf={pdf} number={i + 1} /></div>)}</div>
      </div>
    </div>
  </dialog>;
}
