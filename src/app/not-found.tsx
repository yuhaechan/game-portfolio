import Link from "next/link";
export default function NotFound() { return <main className="message-page"><p className="muted">404</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소를 확인해 주세요.</p><Link href="/" className="text-button">프로젝트 목록으로</Link></main>; }
