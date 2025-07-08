import { NextRequest, NextResponse } from 'next/server';
import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import axios from 'axios';
import { z } from 'zod';

// Define the SerpAPI tool with zod schema:
const searchNews = tool({
  name: 'searchNews',
  description: 'Search for real-time news using SerpAPI.',
  parameters: z.object({
    query: z.string().describe('The news topic or search term to query.'),
  }),
  execute: async ({ query }: { query: string }) => {
    const resp = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY,
        engine: 'google',
      },
    });
    const results = (resp.data.organic_results || [])
      .slice(0, 5)
      .map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      }));
    return { results, source: 'serp' };
  },
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';

  if (!query.trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  // 1) Pre‑check for newsy terms:
  const newsKeywords = [
    'news', 'update', 'latest', 'today', 'recent', 'winner', 'score', 'result'
  ];
  const isNews = newsKeywords.some((w) =>
    query.toLowerCase().includes(w)
  );

  // 2) If it's a news query, call SerpAPI directly:
  if (isNews) {
    try {
      const { results } = await searchNews.execute({ query });
      return NextResponse.json({ source: 'serp', results });
    } catch (e: any) {
      console.error('Direct SerpAPI error:', e);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
  }

  // 3) Otherwise, let Gemini answer (with tool available if still needed):
  try {
    const { text, toolResults } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: query,
      tools: { searchNews },
      // you can also force a function call here:
      // functionCall: isNews ? { name: 'searchNews' } : 'auto',
    });

    // If Gemini ended up calling the tool:
    const used = toolResults?.[0];
    if (used?.name === 'searchNews') {
      return NextResponse.json({
        source: 'serp',
        results: used.result.results || [],
      });
    }

    // Otherwise return Gemini's text:
    return NextResponse.json({ source: 'gemini', response: text });
  } catch (e: any) {
    console.error('Gemini error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
