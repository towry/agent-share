/**
 * Exa web tools - search, contents, and answers via the Exa API.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { Exa } from "exa-js";

const DEFAULT_RESULTS = 5;
const MAX_SNIPPET_LENGTH = 1000;

const LivecrawlSchema = StringEnum(["never", "fallback", "always", "auto", "preferred"] as const);

const TextOptionsSchema = Type.Object({
  includeHtmlTags: Type.Optional(Type.Boolean()),
  maxCharacters: Type.Optional(Type.Integer({ minimum: 1 })),
});

const HighlightsOptionsSchema = Type.Object({
  highlightsPerUrl: Type.Optional(Type.Integer({ minimum: 1 })),
  numSentences: Type.Optional(Type.Integer({ minimum: 1 })),
  query: Type.Optional(Type.String()),
});

const SummaryOptionsSchema = Type.Object({
  query: Type.Optional(Type.String()),
  schema: Type.Optional(Type.Any()),
});

const ContextOptionsSchema = Type.Object({
  maxCharacters: Type.Optional(Type.Integer({ minimum: 1 })),
});

const ContentsOptionsSchema = {
  text: Type.Optional(Type.Union([Type.Boolean(), TextOptionsSchema])),
  highlights: Type.Optional(Type.Union([Type.Boolean(), HighlightsOptionsSchema])),
  summary: Type.Optional(Type.Union([Type.Boolean(), SummaryOptionsSchema])),
  context: Type.Optional(Type.Union([Type.Boolean(), ContextOptionsSchema])),
  subpages: Type.Optional(Type.Boolean()),
  subpageTarget: Type.Optional(Type.String()),
  extras: Type.Optional(Type.Boolean()),
  livecrawl: Type.Optional(LivecrawlSchema),
  livecrawlTimeout: Type.Optional(Type.Integer({ minimum: 1 })),
};

const SearchParams = Type.Object({
  query: Type.String({ description: "Search query" }),
  numResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_RESULTS })),
  type: Type.Optional(Type.String({ description: "Search type (e.g. neural, keyword, deep)" })),
  startPublishedDate: Type.Optional(Type.String({ description: "ISO date" })),
  endPublishedDate: Type.Optional(Type.String({ description: "ISO date" })),
  includeDomains: Type.Optional(Type.Array(Type.String())),
  excludeDomains: Type.Optional(Type.Array(Type.String())),
  ...ContentsOptionsSchema,
});

const SearchAndContentsParams = Type.Object({
  query: Type.String({ description: "Search query" }),
  numResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_RESULTS })),
  type: Type.Optional(Type.String({ description: "Search type (e.g. neural, keyword, deep)" })),
  startPublishedDate: Type.Optional(Type.String({ description: "ISO date" })),
  endPublishedDate: Type.Optional(Type.String({ description: "ISO date" })),
  includeDomains: Type.Optional(Type.Array(Type.String())),
  excludeDomains: Type.Optional(Type.Array(Type.String())),
  ...ContentsOptionsSchema,
});

const FindSimilarParams = Type.Object({
  url: Type.String({ description: "Seed URL" }),
  numResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_RESULTS })),
  excludeSourceDomain: Type.Optional(Type.Boolean()),
  ...ContentsOptionsSchema,
});

const FindSimilarAndContentsParams = Type.Object({
  url: Type.String({ description: "Seed URL" }),
  numResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_RESULTS })),
  excludeSourceDomain: Type.Optional(Type.Boolean()),
  ...ContentsOptionsSchema,
});

const GetContentsParams = Type.Object({
  urls: Type.Array(Type.String(), { description: "URLs to fetch contents for" }),
  ...ContentsOptionsSchema,
});

const AnswerParams = Type.Object({
  query: Type.String({ description: "Question to answer" }),
  text: Type.Optional(Type.Boolean()),
  model: Type.Optional(Type.String()),
  systemPrompt: Type.Optional(Type.String()),
  outputSchema: Type.Optional(Type.Any()),
  userLocation: Type.Optional(Type.Any()),
});

type ExaResult = {
  title: string | null;
  url: string;
  id: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  text?: string;
  highlights?: string[];
  summary?: string;
  context?: string;
  subpages?: Array<{ url?: string; id?: string }>;
  image?: string;
  favicon?: string;
};

type ExaCitation = {
  url: string;
  title: string | null;
  id: string;
  publishedDate?: string;
  text?: string;
};

function formatResults(results: ExaResult[]): string {
  if (!results.length) {
    return "No results.";
  }

  return results
    .map((result, index) => {
      const lines: string[] = [];
      const title = result.title ? result.title : "(untitled)";
      lines.push(`${index + 1}. ${title}`);

      if (result.url) {
        lines.push(result.url);
      }

      if (result.publishedDate) {
        lines.push(result.publishedDate);
      }

      if (typeof result.text === "string") {
        lines.push(result.text.slice(0, MAX_SNIPPET_LENGTH));
      }

      if (typeof result.summary === "string") {
        lines.push(`Summary: ${result.summary}`);
      }

      if (typeof result.context === "string") {
        lines.push(`Context: ${result.context}`);
      }

      if (Array.isArray(result.highlights) && result.highlights.length > 0) {
        lines.push(`Highlights: ${result.highlights.join(" | ")}`);
      }

      if (Array.isArray(result.subpages) && result.subpages.length > 0) {
        const subpageUrls = result.subpages
          .map((subpage) => (subpage.url ? subpage.url : subpage.id ? subpage.id : ""))
          .filter((value) => value.length > 0)
          .slice(0, 5);

        if (subpageUrls.length > 0) {
          lines.push(`Subpages: ${subpageUrls.join(", ")}`);
        }
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function formatAnswer(answer: string, citations: ExaCitation[]): string {
  if (!citations.length) {
    return answer || "No answer.";
  }

  const citationsText = citations
    .map((citation, index) => {
      const title = citation.title ? citation.title : "(untitled)";
      const url = citation.url ? citation.url : "";
      const published = citation.publishedDate ? `\n${citation.publishedDate}` : "";
      return `${index + 1}. ${title}\n${url}${published}`;
    })
    .join("\n");

  return `Answer:\n${answer}\n\nCitations:\n${citationsText}`;
}

function pickDefined<T extends Record<string, unknown>>(
  params: T,
  keys: string[],
): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined) {
      options[key] = value;
    }
  }
  return options;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "exa_web_search",
    label: "Exa Web Search",
    description: "Search the web via Exa and return short snippets with URLs.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(
        Type.Integer({ minimum: 1, maximum: 10, default: DEFAULT_RESULTS }),
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Searching Exa..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const numResults =
        typeof params.numResults === "number" ? params.numResults : DEFAULT_RESULTS;
      const response = await exa.searchAndContents(params.query, {
        numResults,
        text: true,
      });

      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, query: params.query },
      };
    },
  });

  pi.registerTool({
    name: "exa_search",
    label: "Exa Search",
    description: "Search the web via Exa.",
    parameters: SearchParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Searching Exa..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = {
        ...pickDefined(params, [
          "numResults",
          "type",
          "startPublishedDate",
          "endPublishedDate",
          "includeDomains",
          "excludeDomains",
        ]),
        ...pickDefined(params, [
          "text",
          "highlights",
          "summary",
          "context",
          "subpages",
          "subpageTarget",
          "extras",
          "livecrawl",
          "livecrawlTimeout",
        ]),
      };

      const response = await exa.search(params.query, options);
      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, query: params.query },
      };
    },
  });

  pi.registerTool({
    name: "exa_search_and_contents",
    label: "Exa Search + Contents",
    description: "Search the web via Exa and fetch contents.",
    parameters: SearchAndContentsParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Searching Exa..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = {
        ...pickDefined(params, [
          "numResults",
          "type",
          "startPublishedDate",
          "endPublishedDate",
          "includeDomains",
          "excludeDomains",
        ]),
        ...pickDefined(params, [
          "text",
          "highlights",
          "summary",
          "context",
          "subpages",
          "subpageTarget",
          "extras",
          "livecrawl",
          "livecrawlTimeout",
        ]),
      };

      const response = await exa.searchAndContents(params.query, options);
      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, query: params.query },
      };
    },
  });

  pi.registerTool({
    name: "exa_find_similar",
    label: "Exa Find Similar",
    description: "Find documents similar to a URL via Exa.",
    parameters: FindSimilarParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Finding similar content..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = {
        ...pickDefined(params, ["numResults", "excludeSourceDomain"]),
        ...pickDefined(params, [
          "text",
          "highlights",
          "summary",
          "context",
          "subpages",
          "subpageTarget",
          "extras",
          "livecrawl",
          "livecrawlTimeout",
        ]),
      };

      const response = await exa.findSimilar(params.url, options);
      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, url: params.url },
      };
    },
  });

  pi.registerTool({
    name: "exa_find_similar_and_contents",
    label: "Exa Find Similar + Contents",
    description: "Find similar content and fetch contents via Exa.",
    parameters: FindSimilarAndContentsParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Finding similar content..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = {
        ...pickDefined(params, ["numResults", "excludeSourceDomain"]),
        ...pickDefined(params, [
          "text",
          "highlights",
          "summary",
          "context",
          "subpages",
          "subpageTarget",
          "extras",
          "livecrawl",
          "livecrawlTimeout",
        ]),
      };

      const response = await exa.findSimilarAndContents(params.url, options);
      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, url: params.url },
      };
    },
  });

  pi.registerTool({
    name: "exa_get_contents",
    label: "Exa Get Contents",
    description:
      "Download web page content from specific URLs. NOTE: Does not work with raw.githubusercontent.com or plain text URLs - use curl/bash for GitHub raw content instead.",
    parameters: GetContentsParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Fetching contents..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = pickDefined(params, [
        "text",
        "highlights",
        "summary",
        "context",
        "subpages",
        "subpageTarget",
        "extras",
        "livecrawl",
        "livecrawlTimeout",
      ]);

      const response = await exa.getContents(params.urls, options);
      const results = Array.isArray(response.results) ? response.results : [];

      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, urls: params.urls },
      };
    },
  });

  pi.registerTool({
    name: "exa_answer",
    label: "Exa Answer",
    description: "Answer a question with Exa search-backed citations.",
    parameters: AnswerParams,

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Missing EXA_API_KEY in environment." }],
          details: { error: "missing_api_key" },
        };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Generating answer..." }],
        details: undefined,
      });

      const exa = new Exa(apiKey);
      const options = pickDefined(params, [
        "text",
        "model",
        "systemPrompt",
        "outputSchema",
        "userLocation",
      ]);

      const response = await exa.answer(params.query, options);
      const answer = typeof response.answer === "string" ? response.answer : "";
      const citations = Array.isArray(response.citations) ? response.citations : [];

      return {
        content: [{ type: "text", text: formatAnswer(answer, citations) }],
        details: { query: params.query, citations: citations.length },
      };
    },
  });
}
