import { NextRequest, NextResponse } from 'next/server';
import { generateText, tool ,ToolExecutionOptions } from 'ai';
import { google } from '@ai-sdk/google';
import axios from 'axios';
import { z } from 'zod';

// Define interfaces for type safety
interface SerpApiResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiResult[];
}

interface ToolResult {
  toolCallId: string;
  toolName: string;
  args: { query: string };
  result: {
    results: SerpApiResult[];
    source: string;
  };
}

// Define the SerpAPI tool with zod schema:
const searchNews = tool({
  description: 'Search for real-time news using SerpAPI.',
  parameters: z.object({
    query: z.string().describe('The news topic or search term to query.'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const resp = await axios.get<SerpApiResponse>('https://serpapi.com/search.json', {
        params: {
          q: query,
          api_key: process.env.SERP_API_KEY,
          engine: 'google',
        },
      });
      
      const results = (resp.data.organic_results || [])
        .slice(0, 5)
        .map((r: SerpApiResult) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }));
      
      return { results, source: 'serp' };
    } catch (error) {
      console.error('SerpAPI request failed:', error);
      throw new Error('Failed to fetch search results');
    }
  },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';

  if (!query.trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  // 1) Pre-check for newsy terms:
  const newsKeywords = [
    'news', 'update', 'latest', 'today', 'recent', 'winner', 'score', 'result'
  ];
  const isNews = newsKeywords.some((w) =>
    query.toLowerCase().includes(w)
  );

  // 2) If it's a news query, call SerpAPI directly:
  if (isNews) {
    try {
      const { results } = await searchNews.execute({ query }, {} as ToolExecutionOptions);
      return NextResponse.json({ source: 'serp', results });
    } catch (error) {
      console.error('Direct SerpAPI error:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
  }

  // 3) Otherwise, let Gemini answer (with tool available if still needed):
  try {
    const { text, toolResults } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: query,
      tools: { searchNews },
    });

    // If Gemini ended up calling the tool:
    const used = toolResults?.[0] as ToolResult | undefined;
    if (used?.toolName === 'searchNews') {
      return NextResponse.json({
        source: 'serp',
        results: used.result.results || [],
      });
    }

    // Otherwise return Gemini's text:
    return NextResponse.json({ source: 'gemini', response: text });
  } catch (error) {
    console.error('Gemini error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}