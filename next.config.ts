import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the project specification, written by hand. Without this,
  // `next dev` appends its own block to it on every run.
  agentRules: false,

  // The dev overlay sits bottom-left, exactly on top of the fixed
  // "Nova viagem" button.
  devIndicators: false,
};

export default nextConfig;
