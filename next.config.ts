import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["langchain", "@langchain/core", "@langchain/langgraph"],
};

export default nextConfig;
