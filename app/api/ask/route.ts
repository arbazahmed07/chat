// import { NextRequest, NextResponse } from 'next/server';
// import { generateText, tool, ToolExecutionOptions } from 'ai';
// import { google } from '@ai-sdk/google';
// import axios from 'axios';
// import { z } from 'zod';

// // Define interfaces for type safety
// interface SerpApiResult {
//   title: string;
//   link: string;
//   snippet: string;
// }

// interface SerpApiResponse {
//   organic_results?: SerpApiResult[];
// }

// interface ToolResult {
//   toolCallId: string;
//   toolName: string;
//   args: { query: string };
//   result: {
//     results: SerpApiResult[];
//     source: string;
//   };
// }

// // Define the SerpAPI tool with zod schema:
// const searchNews = tool({
//   description: 'Search for real-time news using SerpAPI.',
//   parameters: z.object({
//     query: z.string().describe('The news topic or search term to query.'),
//   }),
//   execute: async ({ query }: { query: string }) => {
//     try {
//       const resp = await axios.get<SerpApiResponse>('https://serpapi.com/search.json', {
//         params: {
//           q: query,
//           api_key: process.env.SERP_API_KEY,
//           engine: 'google',
//         },
//       });

//       const results = (resp.data.organic_results || [])
//         .slice(0, 5)
//         .map((r: SerpApiResult) => ({
//           title: r.title,
//           link: r.link,
//           snippet: r.snippet,
//         }));

//       return { results, source: 'serp' };
//     } catch (error) {
//       console.error('SerpAPI request failed:', error);
//       throw new Error('Failed to fetch search results');
//     }
//   },
// });

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const query = searchParams.get('query') || '';

//   if (!query.trim()) {
//     return NextResponse.json({ error: 'Missing query' }, { status: 400 });
//   }

//   // Keyword check: skip Gemini if clearly news-related
//   const newsKeywords = [
//     'news', 'update', 'latest', 'today', 'recent', 'winner', 'score', 'result', 'who won'
//   ];
//   const isNews = newsKeywords.some((w) => query.toLowerCase().includes(w));

//   if (isNews) {
//     try {
//       const { results } = await searchNews.execute({ query }, {} as ToolExecutionOptions);
//      return NextResponse.json({
//   source: 'serp-direct',
//   response: results.map((r) => `🔹 ${r.title}\n${r.link}`).join('\n\n'),
// });

//     } catch (error) {
//       console.error('Direct SerpAPI error:', error);
//       return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
//     }
//   }

//   // Let Gemini try, tool available
//   try {
//     const { text, toolResults } = await generateText({
//       model: google('models/gemini-1.5-flash'),
//       prompt: query,
//       tools: { searchNews },
//     });

//     const used = toolResults?.[0] as ToolResult | undefined;

//     // If Gemini used the tool
//     if (used?.toolName === 'searchNews') {
//       return NextResponse.json({
//         source: 'serp-via-gemini',
//         results: used.result.results || [],
//       });
//     }

//     // Detect vague or outdated answers
//     const vagueResponse =
//       !text ||
//       text.trim().length < 20 ||
//       /sorry|i don'?t know|can't help/i.test(text);

//     const geminiAnswerIsOutdated = /\bnot have access to real-time information\b/i.test(text);

//     const queryIsTimeSensitive = /\b(winner|who won|score|result|today|latest|update|news)\b/i.test(query);

//     if (vagueResponse || geminiAnswerIsOutdated || queryIsTimeSensitive) {
//       const { results } = await searchNews.execute({ query }, {} as ToolExecutionOptions);
//       return NextResponse.json({ source: 'serp-fallback', results });
//     }

//     // Else return Gemini’s response
//     return NextResponse.json({ source: 'gemini', response: text });
//   } catch (error) {
//     console.error('Gemini error:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import { generateText, tool, ToolExecutionOptions } from 'ai';
import { google } from '@ai-sdk/google';
import axios from 'axios';
import { z } from 'zod';

// Interfaces
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

// Define SerpAPI Tool 
const searchNews = tool({
  description: 'Search for real-time news using SerpAPI.',
  parameters: z.object({
    query: z.string().describe('The news topic or search term to query.'),
  }),
  execute: async ({ query }) => {
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
        .map((r) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }));

      return { results, source: 'serp' };
    } catch (err) {
      console.error('SerpAPI fetch failed:', err);
      throw new Error('Could not retrieve news from SerpAPI');
    }
  },
});

// Format results for summarization
const formatResultsForSummary = (results: SerpApiResult[]) =>
  results.map((r, i) => `${i + 1}. ${r.title} — ${r.snippet}`).join('\n');

// Gemini-based summarization
const summarizeResults = async (results: SerpApiResult[]) => {
  const input = formatResultsForSummary(results);
  const { text: summary } = await generateText({
    model: google('models/gemini-1.5-flash'),
    prompt: `Summarize the following news headlines and snippets into 2-3 concise sentences:\n\n${input}`,
  });
  return summary;
};

// Main GET handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';

  if (!query.trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const newsKeywords = ['news', 'update', 'latest', 'today', 'recent', 'winner', 'score', 'result', 'who won'];
  const isNews = newsKeywords.some((k) => query.toLowerCase().includes(k));

  if (isNews) {
    try {
      const { results } = await searchNews.execute({ query }, {} as ToolExecutionOptions);
      const summary = await summarizeResults(results);
      return NextResponse.json({
        source: 'serp-direct',
        summary,
        articles: results,
      });
    } catch (error) {
      console.error('Direct SerpAPI error:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
  }

  // Gemini + tool path
  try {
    const { text, toolResults } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: query,
      tools: { searchNews }, // toolName is inferred here
    });

    const usedTool = toolResults?.[0] as ToolResult | undefined;

    if (usedTool?.toolName === 'searchNews') {
      const summary = await summarizeResults(usedTool.result.results || []);
      return NextResponse.json({
        source: 'serp-via-gemini',
        summary,
        articles: usedTool.result.results,
      });
    }

    const vague = !text || text.trim().length < 20 || /sorry|don't know|can't help/i.test(text);
    const outdated = /\bnot have access to real-time information\b/i.test(text);
    const sensitive = /\b(winner|who won|score|result|today|latest|update|news)\b/i.test(query);

    if (vague || outdated || sensitive) {
      const { results } = await searchNews.execute({ query }, {} as ToolExecutionOptions);
      const summary = await summarizeResults(results);
      return NextResponse.json({ source: 'serp-fallback', summary, articles: results });
    }

    return NextResponse.json({ source: 'gemini', response: text });
  } catch (error) {
    console.error('Gemini error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
