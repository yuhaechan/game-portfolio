import { Portfolio } from "@/components/portfolio";
import { published } from "@/lib/published";

export default function Home() { return <Portfolio snapshot={published} />; }
