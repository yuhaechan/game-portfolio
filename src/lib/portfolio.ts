export interface PortfolioProject {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  summary: string;
  role: string;
  tools: string;
  period: string;
  visibility: "public" | "private";
  isExample: boolean;
  overview: string;
  purpose: string;
  problem: string;
  analysis: string;
  solution: string;
  validation: string;
  cover: string;
  attachments: { name: string; path: string }[];
  videos: { name: string; url: string }[];
}

export interface PortfolioSnapshot {
  title: string;
  name: string;
  introduction: string;
  revision: number;
  publishedAt: string | null;
  projects: PortfolioProject[];
}

export const projectTextFields = ["title", "subtitle", "category", "summary", "role", "tools", "period", "overview", "purpose", "problem", "analysis", "solution", "validation"] as const;
export const assetPattern = /^\/media\/[a-f0-9-]{36}\.(?:pdf|png|jpg|gif|webp)$/;
const imagePattern = /^\/media\/[a-f0-9-]{36}\.(?:png|jpg|gif|webp)$/;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("데이터 형식이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 20000) {
  if (typeof value !== "string" || value.length > max) throw new Error("입력값이 없거나 너무 깁니다.");
  return value.trim();
}

export function validateSnapshot(value: unknown): PortfolioSnapshot {
  const data = object(value);
  const title = text(data.title, 150);
  if (!title) throw new Error("포트폴리오 제목을 입력하세요.");
  if (!Array.isArray(data.projects) || data.projects.length > 100) throw new Error("프로젝트는 최대 100개까지 등록할 수 있습니다.");
  const ids = new Set<string>();
  const projects = data.projects.map((value): PortfolioProject => {
    const raw = object(value);
    const id = text(raw.id, 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ids.has(id)) throw new Error("프로젝트 주소는 중복 없는 영문 소문자·숫자·하이픈으로 입력하세요.");
    ids.add(id);
    const fields = Object.fromEntries(projectTextFields.map(key => [key, text(raw[key], ["title", "category"].includes(key) ? 150 : 20000)])) as Pick<PortfolioProject, typeof projectTextFields[number]>;
    if (!fields.title) throw new Error("프로젝트 제목을 입력하세요.");
    if (raw.visibility !== "public" && raw.visibility !== "private") throw new Error("공개 여부가 올바르지 않습니다.");
    if (typeof raw.isExample !== "boolean") throw new Error("예시 표시 설정을 확인하세요.");
    const cover = text(raw.cover, 150);
    if (cover && !imagePattern.test(cover)) throw new Error("대표 이미지를 다시 선택하세요.");
    if (!Array.isArray(raw.attachments) || raw.attachments.length > 50 || !Array.isArray(raw.videos) || raw.videos.length > 20) throw new Error("첨부자료 수를 확인하세요.");
    const attachments = raw.attachments.map(value => {
      const entry = object(value), path = text(entry.path, 150), name = text(entry.name, 250);
      if (!assetPattern.test(path) || !name) throw new Error("첨부자료 경로가 올바르지 않습니다.");
      return { name, path };
    });
    const videos = raw.videos.map(value => {
      const entry = object(value), url = text(entry.url, 2000), name = text(entry.name, 250);
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new Error("영상 주소를 확인하세요."); }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || !["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com"].includes(parsed.hostname) || !name) throw new Error("영상은 YouTube 또는 Vimeo의 HTTPS 주소를 입력하세요.");
      return { name, url };
    });
    return { id, ...fields, visibility: raw.visibility, isExample: raw.isExample, cover, attachments, videos };
  });
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) throw new Error("저장 버전을 확인하세요.");
  const publishedAt = data.publishedAt === null ? null : text(data.publishedAt, 40);
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) throw new Error("게시 일시가 올바르지 않습니다.");
  return { title, name: text(data.name, 100), introduction: text(data.introduction, 1000), revision: data.revision as number, publishedAt, projects };
}

export function publicSnapshot(value: PortfolioSnapshot): PortfolioSnapshot {
  const validated = validateSnapshot(value);
  return { ...validated, projects: validated.projects.filter(project => project.visibility === "public") };
}

export function referencedAssets(snapshot: PortfolioSnapshot) {
  return [...new Set(snapshot.projects.flatMap(project => [project.cover, ...project.attachments.map(asset => asset.path)]).filter(Boolean))];
}

export function assetUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
