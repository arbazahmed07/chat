import axios from 'axios';
import { NextRequest,NextResponse } from 'next/server';
type SearchResult={
  title: string;
  link: string;
  snippet: string;
}
type SerpApiResponse = {
  organic_results?: SearchResult[];
  [key: string]: any; // To allow other properties from the API response
}
export  async function GET(req: NextRequest) {
  const {searchParams}= new URL(req.url);

    console.log('Received request:', req);
  const query= searchParams.get('query');
    console.log('Received query:', query);
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing query parameter' }, { status: 400 });
  }
  console.log('Received query:', query);

  try {
    const response = await axios.get<SerpApiResponse>('https://serpapi.com/search.json',{
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY, 
        engine: 'google'
      },
    });
    return NextResponse.json(response.data);
  } catch (error:any) {
    console.error('Error fetching data from SerpAPI:', error.message);
    return NextResponse.json({ error: 'Failed to fetch data from SerpAPI' }, { status: 500 });
  }


}
