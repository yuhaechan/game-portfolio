import type { NextConfig } from "next";
import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pdfRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdfPublic = path.join(process.cwd(), "public/pdfjs");
mkdirSync(pdfPublic, { recursive: true });
copyFileSync(path.join(pdfRoot, "build/pdf.worker.min.mjs"), path.join(pdfPublic, "pdf.worker.min.mjs"));
for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
  cpSync(path.join(pdfRoot, directory), path.join(pdfPublic, directory), { recursive: true });
}

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
  // Set only for a GitHub project site: /repository-name.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
};
export default config;
