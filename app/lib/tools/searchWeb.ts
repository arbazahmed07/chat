
import { tool } from 'ai';
import axios from 'axios';
import { z } from 'zod';

// ----- Types -----
interface SerpApiResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiResult[];
  error?: string;
}

// ----- Tool: searchWeb -----
export const searchWeb = tool({
  description: 'Search the web for current information, news, sports results, recent events, or any information that might have changed recently.',
  parameters: z.object({
    query: z.string().describe('Search query to find current information')
  }),
  execute: async ({ query }) => {
    if (!process.env.SERP_API_KEY) {
      throw new Error('SERP_API_KEY not configured');
    }

    const resp = await axios.get<SerpApiResponse>('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY,
        engine: 'google',
        num: 5
      },
      timeout: 10000,
    });

    if (resp.data.error) {
      throw new Error(resp.data.error);
    }

    const results = (resp.data.organic_results || []).map(r => ({
      title: r.title || 'No title',
      link: r.link || '',
      snippet: r.snippet || 'No snippet',
    }));

    return {
      results,
      query,
      source: 'serpapi',
    };
  },
});
