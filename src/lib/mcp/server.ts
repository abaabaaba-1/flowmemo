import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getActiveJourney, getJourneysByUser } from "@/lib/db/queries/journeys";
import { getCapsulesByJourney, createCapsule } from "@/lib/db/queries/capsules";
import { nanoid } from "@/lib/utils";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "conch",
    version: "1.0.0",
  });

  // Tool 1: Get active journey
  server.registerTool(
    "get_active_journey",
    {
      description: "获取用户当前进行中的旅程信息，包括目的地和旅程描述。",
      inputSchema: {},
    },
    async () => {
      const journey = await getActiveJourney(userId);
      if (!journey) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "没有进行中的旅程" }],
        };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(journey, null, 2) }] };
    }
  );

  // Tool 2: List all journeys
  server.registerTool(
    "list_journeys",
    {
      description: "列出用户所有的旅程记录，按时间倒序排列。",
      inputSchema: {},
    },
    async () => {
      const journeys = await getJourneysByUser(userId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: journeys.length, journeys },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 3: Get capsules for a journey
  server.registerTool(
    "get_journey_capsules",
    {
      description: "获取指定旅程的所有记忆胶囊，包含 AI 生成的旅行文案、关键词和照片信息。",
      inputSchema: {
        journey_id: z.string().describe("旅程 ID"),
      },
    },
    async ({ journey_id }) => {
      const capsules = await getCapsulesByJourney(journey_id, userId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: capsules.length, capsules }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 4: Add a memory capsule
  server.registerTool(
    "add_memory_capsule",
    {
      description: "向指定旅程中添加一枚记忆胶囊，记录旅途中的文字碎片。",
      inputSchema: {
        journey_id: z.string().describe("旅程 ID"),
        title: z.string().describe("记忆胶囊标题，简短有诗意"),
        user_text: z.string().optional().describe("用户的原始文字或语音转写内容"),
        location: z.string().optional().describe("发生地点"),
        keywords: z.array(z.string()).optional().describe("关键词列表，最多5个"),
      },
    },
    async ({ journey_id, title, user_text, location, keywords }) => {
      const capsule = await createCapsule({
        id: nanoid(),
        journeyId: journey_id,
        userId,
        title,
        userRawText: user_text,
        location,
        keywords,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(capsule, null, 2) }],
      };
    }
  );

  // Tool 5: Get journey summary
  server.registerTool(
    "get_journey_summary",
    {
      description: "获取旅程的完整摘要，包括胶囊数量、地点列表和关键词云。",
      inputSchema: {
        journey_id: z.string().describe("旅程 ID"),
      },
    },
    async ({ journey_id }) => {
      const capsules = await getCapsulesByJourney(journey_id, userId);
      const locations = [...new Set(capsules.map((c) => c.location).filter(Boolean))];
      const allKeywords = capsules.flatMap((c) => c.keywords ?? []);
      const keywordFreq: Record<string, number> = {};
      allKeywords.forEach((kw) => { keywordFreq[kw] = (keywordFreq[kw] ?? 0) + 1; });
      const topKeywords = Object.entries(keywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kw]) => kw);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                capsule_count: capsules.length,
                locations,
                top_keywords: topKeywords,
                total_photos: capsules.reduce((s, c) => s + c.photoCount, 0),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
