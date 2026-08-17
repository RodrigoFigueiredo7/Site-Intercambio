import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the project specification, written by hand. Without this,
  // `next dev` appends its own block to it on every run.
  agentRules: false,
};

export default nextConfig;
