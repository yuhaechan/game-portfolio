"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { assetUrl, type PortfolioSnapshot, type PortfolioProject } from "@/lib/portfolio";

const sections: [keyof PortfolioProject, string][] = [["overview", "프로젝트 개요"], ["purpose", "기획 목적"], ["problem", "문제 정의"], ["analysis", "분석"], ["solution", "설계와 해결 방안"], ["validation", "검증 결과"]];

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
  const index = active ? projects.indexOf(active) : -1;
  function navigate(event: React.MouseEvent, id?: string) {
    if (!preview) return;
    event.preventDefault(); setSelection(id); window.scrollTo(0, 0);
  }
  return <>
    <a className="skip-link" href="#main">본문으로 이동</a>
    <header className="site-header"><Link href="/" onClick={event => navigate(event)}>{data.title}</Link><Link className="header-link" href="/#projects" onClick={event => navigate(event)}>프로젝트</Link></header>
    <main id="main" className="portfolio-main">
      {preview && <p className="preview-banner">로컬 미리보기 · 비공개 프로젝트 포함</p>}
      {active ? <>
        <Link className="back-link" href="/#projects" onClick={event => navigate(event)}>← 프로젝트 목록</Link>
        <div className="detail-heading"><p className="category">{active.category}</p><h1>{active.title}</h1>{active.subtitle && <p className="subtitle">{active.subtitle}</p>}{active.isExample && <span className="example-label">예시 · 내용 확인 필요</span>}<p className="detail-summary">{active.summary}</p></div>
        {[active.role, active.period, active.tools].some(Boolean) && <dl className="project-meta">{[["담당 역할", active.role], ["기간", active.period], ["도구", active.tools]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {active.cover && <img className="detail-cover" src={preview ? `http://127.0.0.1:4310${active.cover}` : assetUrl(active.cover)} alt={`${active.title} 대표 이미지`} />}
        <div className="detail-content">{sections.filter(([key]) => active[key]).map(([key, title]) => <section key={key}><h2>{title}</h2><p>{String(active[key])}</p></section>)}</div>
        {(active.attachments.length > 0 || active.videos.length > 0) && <section className="attachments"><h2>관련 자료</h2>{active.attachments.map(asset => <a key={asset.path} href={preview ? `http://127.0.0.1:4310${asset.path}` : assetUrl(asset.path)} target="_blank" rel="noopener noreferrer">{asset.name}<span>{asset.path.endsWith(".pdf") ? "PDF 열기 ↗" : "이미지 보기 ↗"}</span></a>)}{active.videos.map(video => <a key={video.url} href={video.url} target="_blank" rel="noopener noreferrer">{video.name}<span>영상 보기 ↗</span></a>)}</section>}
        <nav className="project-pagination" aria-label="다른 프로젝트">{projects[index - 1] ? <Link href={`/projects/${projects[index - 1].id}/`} onClick={event => navigate(event, projects[index - 1].id)}>← {projects[index - 1].title}</Link> : <span/>}{projects[index + 1] && <Link href={`/projects/${projects[index + 1].id}/`} onClick={event => navigate(event, projects[index + 1].id)}>{projects[index + 1].title} →</Link>}</nav>
      </> : <>
        <section className="intro"><h1>{data.title}</h1>{data.name && <p className="author">{data.name}</p>}{data.introduction && <p>{data.introduction}</p>}</section>
        <section id="projects" aria-labelledby="projects-title"><div className="section-title"><h2 id="projects-title">프로젝트</h2><span>{projects.length}</span></div><div className="project-list">{projects.map((project, index) => <Link className="project-card" key={project.id} href={`/projects/${project.id}/`} onClick={event => navigate(event, project.id)}><span className="project-number">{String(index + 1).padStart(2, "0")}</span><div className="project-card-copy"><p className="category">{project.category}</p><h3>{project.title}</h3>{project.subtitle && <p className="card-subtitle">{project.subtitle}</p>}<p className="card-summary">{project.summary}</p>{project.isExample && <span className="example-label">예시</span>}</div>{project.cover && <img src={preview ? `http://127.0.0.1:4310${project.cover}` : assetUrl(project.cover)} alt="" className="project-thumbnail" loading="lazy" />}<span className="card-arrow" aria-hidden="true">↗</span></Link>)}</div>{!projects.length && <p className="empty-state">공개된 프로젝트가 없습니다.</p>}</section>
      </>}
    </main>
    <footer className="site-footer">{data.name || data.title}</footer>
  </>;
}
