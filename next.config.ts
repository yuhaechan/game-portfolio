import type { NextConfig } from "next";

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
