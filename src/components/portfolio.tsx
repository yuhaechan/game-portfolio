"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { assetUrl, videoAssetPattern, type PortfolioSnapshot, type PortfolioProject } from "@/lib/portfolio";

const PdfViewer = dynamic(() => import("./pdf-viewer"), { ssr: false, loading: () => <p className="preview-banner">문서 뷰어를 불러오는 중…</p> });

const sections: [keyof PortfolioProject, string][] = [["overview", "프로젝트 개요"], ["purpose", "기획 목적"], ["problem", "문제 정의"], ["analysis", "분석"], ["solution", "설계와 해결 방안"], ["validation", "검증 결과"]];

function Chevron() {
  return <svg className="card-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function originalPdf(project: PortfolioProject) {
  return ![project.summary, ...sections.map(([key]) => project[key])].some(Boolean)
    ? project.attachments.find(asset => asset.path.endsWith(".pdf"))
    : undefined;
}

function PlanningDocuments({ documents, preview }: { documents: PortfolioProject["attachments"]; preview: boolean }) {
  const [selected, setSelected] = useState<PortfolioProject["attachments"][number]>();
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const isOpen = Boolean(selected);
  function outsideDialog(event: React.PointerEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  useEffect(() => {
    if (!isOpen) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  if (!documents.length) return null;
  return <section className="planning-documents" aria-labelledby="planning-documents-title">
    <h2 id="planning-documents-title">기획 문서</h2>
    <div className="planning-document-list">{documents.map(asset => <button key={asset.path} onClick={() => setSelected(asset)} aria-haspopup="dialog"><span>{asset.name.replace(/\s*·\s*v\d[\s\S]*$/, "")}</span><span className="planning-document-action">문서 보기 <Chevron /></span></button>)}</div>
    {selected && <dialog ref={dialog} className="planning-document-dialog" aria-labelledby="planning-document-title" onClose={() => setSelected(undefined)} onPointerDown={event => { backdropPressed.current = outsideDialog(event); }} onPointerUp={event => { if (backdropPressed.current && outsideDialog(event)) event.currentTarget.close(); backdropPressed.current = false; }} onPointerCancel={() => { backdropPressed.current = false; }}>
      <header><h2 id="planning-document-title">{selected.name}</h2><button autoFocus onClick={() => dialog.current?.close()} aria-label="기획 문서 닫기">✕ 닫기</button></header>
      <div className="planning-document-body"><PdfViewer key={selected.path} title={selected.name} loadingScreen src={preview ? `http://127.0.0.1:4310${selected.path}` : assetUrl(selected.path)} /></div>
      <nav className="planning-document-switcher" aria-label="기획 문서 이동"><p>기획 문서</p><div>{documents.map(asset => <button key={asset.path} aria-current={asset.path === selected.path ? "true" : undefined} onClick={() => setSelected(asset)}><span>{asset.name}</span><span className="planning-document-action">{asset.path === selected.path ? <strong>현재 보는 문서</strong> : <>문서 보기 <Chevron /></>}</span></button>)}</div></nav>
    </dialog>}
  </section>;
}

export function Portfolio({ snapshot, projectId }: { snapshot: PortfolioSnapshot; projectId?: string }) {
  const [data, setData] = useState(snapshot);
  const [selection, setSelection] = useState(projectId);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!["127.0.0.1", "localhost"].includes(location.hostname) || !new URLSearchParams(location.search).has("preview")) return;
    setPreview(true);
    function receive(event: MessageEvent) {
      if (event.origin !== "http://127.0.0.1:4310" || event.source !== window.parent || event.data?.type !== "portfolio-preview") return;
      setData(event.data.snapshot);
      setSelection(undefined);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "portfolio-ready" }, "http://127.0.0.1:4310");
    return () => window.removeEventListener("message", receive);
  }, []);
  const projects = data.projects;
  const active = projects.find(project => project.id === selection);
  function navigate(event: React.MouseEvent, id?: string) {
    if (!preview) return;
    event.preventDefault(); setSelection(id); window.scrollTo(0, 0);
  }
  function collection(section: PortfolioProject["section"], title: string) {
    const entries = projects.filter(project => project.section === section);
    const anchor = section === "portfolio" ? "portfolio" : "projects";
    const CardTitle = section === "portfolio" ? "h4" : "h3";
    function cards(items: PortfolioProject[]) {
      return <div className="project-list">{items.map(project => {
          return (
          <Link className="project-card" key={project.id} href={`/projects/${project.id}/`} onClick={event => navigate(event, project.id)}>
            <div className="project-card-copy">
              <div className="project-name"><CardTitle>{project.subtitle ? <><span className="game-title">{project.title}</span><span className="work-title">{project.subtitle}</span></> : <span className="work-title">{project.title}</span>}</CardTitle>{project.isExample && <span className="example-label">예시</span>}</div>
              {project.summary && <p className="card-summary">{project.summary}</p>}
            </div>
            {project.cover && <img src={preview ? `http://127.0.0.1:4310${project.cover}` : assetUrl(project.cover)} alt="" className="project-thumbnail" loading="lazy" />}
            <div className="project-tail">{project.category && <span className="category">{project.category}</span>}<Chevron /></div>
          </Link>
        );})}</div>;
    }
    return (
      <section id={anchor} className="projects-section work-section" aria-labelledby={`${anchor}-list-title`}>
        <div className="section-title"><h2 id={`${anchor}-list-title`}>{title}</h2><span>{entries.length}개</span></div>
        {section === "portfolio" ? ([['game', '게임 기획'], ['app', '앱·서비스']] as const).map(([kind, label]) => {
          const items = entries.filter(project => (project.kind || "game") === kind);
          return items.length > 0 && <div className="portfolio-group" key={kind}><div className="portfolio-group-title"><h3>{label}</h3><span>{items.length}개</span></div>{cards(items)}</div>;
        }) : cards(entries)}
        {!entries.length && <p className="empty-state">등록된 {title === "포트폴리오" ? "포트폴리오가" : "프로젝트가"} 없습니다.</p>}
      </section>
    );
  }
  return <>
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="site-header-bar" aria-hidden="true"><div className="site-header" /></header>
    <main id="main" className={`portfolio-main${active ? (originalPdf(active) ? " portfolio-document" : "") : " portfolio-home"}`}>
      {preview && <p className="preview-banner">로컬 미리보기 · 비공개 프로젝트 포함</p>}
      {active ? <>
        <nav className="detail-nav" aria-label="목록으로 돌아가기"><Link className="detail-back" href={active.section === "portfolio" ? "/#portfolio" : "/#projects"} onClick={event => navigate(event)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{active.section === "portfolio" ? "포트폴리오" : "프로젝트"} 목록으로</span></Link></nav>
        {originalPdf(active) && <>
          <div className="pdf-heading"><p className="game-title">{active.title}</p><h1>{active.subtitle || active.title}</h1></div>
          <PdfViewer key={originalPdf(active)!.path} title={active.subtitle || active.title} src={preview ? `http://127.0.0.1:4310${originalPdf(active)!.path}` : assetUrl(originalPdf(active)!.path)} />
          <PlanningDocuments key={active.id} documents={active.attachments.filter(asset => asset.path.endsWith(".pdf") && asset.path !== originalPdf(active)!.path)} preview={preview} />
        </>}
        {!originalPdf(active) && <>
        <div className="detail-heading"><p className="category">{active.category}</p><h1>{active.title}</h1>{active.subtitle && <p className="subtitle">{active.subtitle}</p>}{active.isExample && <span className="example-label">예시 · 내용 확인 필요</span>}<p className="detail-summary">{active.summary}</p></div>
        {[active.role, active.period, active.tools].some(Boolean) && <dl className="project-meta">{[["담당 역할", active.role], ["기간", active.period], ["도구", active.tools]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {active.cover && <img className="detail-cover" src={preview ? `http://127.0.0.1:4310${active.cover}` : assetUrl(active.cover)} alt={`${active.title} 대표 이미지`} />}
        <div className="detail-content">{sections.filter(([key]) => active[key]).map(([key, title]) => <section key={key}><h2>{title}</h2><p>{String(active[key])}</p></section>)}</div>
        {(active.attachments.length > 0 || active.videos.length > 0) && <section className="attachments"><h2>관련 자료</h2>{active.attachments.map(asset => <a key={asset.path} href={preview ? `http://127.0.0.1:4310${asset.path}` : assetUrl(asset.path)} target="_blank" rel="noopener noreferrer">{asset.name}<span>{asset.path.endsWith(".pdf") ? "PDF 열기 ↗" : "이미지 보기 ↗"}</span></a>)}{active.videos.map(video => <a key={video.url} href={video.url} target="_blank" rel="noopener noreferrer">{video.name}<span>영상 보기 ↗</span></a>)}</section>}
        </>}
        {active.videos.some(video => videoAssetPattern.test(video.url)) && <section className="project-videos" aria-labelledby="project-videos-title">
          <h2 id="project-videos-title">참고자료</h2>
          {active.videos.filter(video => videoAssetPattern.test(video.url)).map(video => <figure key={video.url}>
            <figcaption>{video.name}</figcaption>
            <video controls playsInline preload="metadata" controlsList="nodownload" aria-label={video.name}>
              <source src={preview ? `http://127.0.0.1:4310${video.url}` : assetUrl(video.url)} type="video/mp4" />
              이 브라우저에서는 영상을 재생할 수 없습니다.
            </video>
          </figure>)}
        </section>}
      </> : <>
        <section className="intro" aria-labelledby="portfolio-title"><div className="section-inner"><h1 id="portfolio-title">{data.title}</h1>{data.name && <p className="author">{data.name}</p>}<div className="intro-contact-row">{data.introduction && <p>{data.introduction}</p>}<a className="intro-email" href="mailto:dbgocks99@naver.com"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="m4 6 8 7 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>dbgocks99@naver.com</span></a></div></div></section>
        {collection("portfolio", "포트폴리오")}
        {collection("project", "프로젝트")}
      </>}
    </main>
  </>;
}
