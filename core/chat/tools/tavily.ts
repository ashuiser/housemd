import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { interrupt } from "@langchain/langgraph";
import { db } from "@/core/db/client";
import { trustedDomains } from "@/core/db/schema";
import { eq } from "drizzle-orm";
import { TavilySearch, type TavilySearchResponse } from "@langchain/tavily";

const tavilyClient = new TavilySearch();

export const tavilySearch = tool(
  async ({ query }, config) => {
    const internetMode = config.configurable?.internetMode || "all";
    const userId = config.configurable?.userId;

    if (!userId) {
      return "Error: userId is missing from config.";
    }

    if (!["all", "trusted_only", "none", "ask"].includes(internetMode)) {
      return "Error: Invalid internetMode.";
    }

    if (internetMode === "none") {
      return "Error: Internet access is currently disabled by the user.";
    }

    let includeDomains: string[] = [];

    if (internetMode === "trusted_only") {
      const urls = await db
        .select()
        .from(trustedDomains)
        .where(eq(trustedDomains.userId, userId));
      
      if (urls.length === 0) {
        return "No trusted URLs configured. Search aborted.";
      }

      includeDomains = urls.map((u) => u.url);
    }

    let data: TavilySearchResponse;
    try {
      data = await tavilyClient.invoke({
        query,
        include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        max_results: 5,
      });
    } catch (e) {
      return `Tavily Search failed: ${e instanceof Error ? e.message : String(e)}`;
    }

    let results = data.results || [];

    if (internetMode === "ask") {
      if (results.length === 0) {
        return "No results found to approve.";
      }

      // Pause execution and ask human
      const approval = interrupt({
        type: "tavily_approval",
        results,
      }) as { approvedUrls?: string[] };

      if (!approval.approvedUrls || approval.approvedUrls.length === 0) {
        return "User rejected all search results.";
      }

      results = results.filter(r => approval.approvedUrls?.includes(r.url));
      
      if (results.length === 0) {
        return "User rejected all search results.";
      }
    }

    if (results.length === 0) {
      return "No matching results found after filtering.";
    }

    return JSON.stringify(results);
  },
  {
    name: "tavily_search",
    description: "Search the internet for up-to-date information.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);
