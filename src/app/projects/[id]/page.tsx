import { notFound } from "next/navigation";
import { Portfolio } from "@/components/portfolio";
import { published } from "@/lib/published";

export const dynamicParams = false;
export function generateStaticParams() {
  // Export a 404 placeholder too when no projects are public.
  return published.projects.length ? published.projects.map(project => ({ id: project.id })) : [{ id: "no-projects" }];
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = published.projects.find(project => project.id === id);
  return { title: project ? `${project.title} · ${published.title}` : published.title, description: project?.summary };
}
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!published.projects.some(project => project.id === id)) notFound();
  return <Portfolio key={id} snapshot={published} projectId={id} />;
}
