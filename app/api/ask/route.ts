

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { searchWeb } from '../../lib/tools/searchWeb'; 

// ----- Types -----
interface SerpApiResult {
  title: string;
  link: string;
  snippet: string;
}

// ----- API Route -----
export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];

    const { text: aiResponse, toolResults } = await generateText({
      model: google('models/gemini-1.5-flash'),
      prompt: `You are a helpful assistant. Today's date is ${currentDate}.

For the user query: "${query}"

If you need current information, use the searchWeb tool. After getting search results, provide a comprehensive answer based on the search results. Always include relevant details and cite the sources you found.

If you don't need to search, answer directly from your knowledge.`,
      tools: { searchWeb },
      temperature: 0.7,
      maxTokens: 1024,
      maxSteps: 3,
    });

    const searchResult = toolResults?.find(r => r.toolName === 'searchWeb');

    // If search was performed and results exist
    if (searchResult?.result?.results?.length) {
      let summary = aiResponse.trim();

      // Improve short summary
      if (summary.length < 50) {
        const { text: betterSummary } = await generateText({
          model: google('models/gemini-1.5-flash'),
          prompt: `Based on these search results for "${query}":\n\n${searchResult.result.results.map((r: SerpApiResult, i: number) =>
            `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.link}`
          ).join('\n\n')}\n\nProvide a comprehensive answer to the user's question. Be informative and cite the sources.`,
          maxTokens: 512,
        });
        summary = betterSummary.trim();
      }

      return NextResponse.json({
        content: summary,
        results: searchResult.result.results,
        searchPerformed: true,
      });
    }

    // No search, use AI knowledge
    return NextResponse.json({
      content: aiResponse.trim(),
      searchPerformed: false,
    });

  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({
      error: 'Internal Error',
      details: (err as Error).message
    }, { status: 500 });
  }
}
