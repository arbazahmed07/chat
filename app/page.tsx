"use client";
import { useState, useRef, useEffect } from "react";

type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; results?: SearchResult[] };

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = query.trim();
    if (!text) return;

    // 1) add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`/api/ask?query=${encodeURIComponent(text)}`);
      const data = await res.json();

      if (data.source === "serp") {
        // assistant with results
        setMessages((prev) => [
          ...prev,
          { role: "assistant", results: data.results },
        ]);
      } else if (data.source === "serp+gemini") {
        // if you implemented combined path
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.summary,
            results: data.raw,
          },
        ]);
      } else {
        // plain text answer
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Failed to fetch response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="flex flex-col h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat with AI</h1>

      <div className="flex-1 overflow-y-auto border rounded p-4 space-y-4 bg-white">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="text-right">
              <div className="inline-block bg-blue-100 text-blue-900 p-2 rounded-lg">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="text-left">
              {msg.content && (
                <div className="inline-block bg-gray-100 p-2 rounded-lg mb-2">
                  {msg.content}
                </div>
              )}
              {msg.results && (
                <ul className="space-y-2">
                  {msg.results.map((r, idx) => (
                    <li key={idx} className="border-b pb-1">
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {r.title}
                      </a>
                      <p className="text-sm text-gray-700">{r.snippet}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          className="flex-1 p-2 border rounded resize-none"
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message…"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={sendMessage}
          disabled={loading}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </main>
  );
}










































// import { NextRequest, NextResponse } from 'next/server';
// import { generateText, tool } from 'ai';
// import { google } from '@ai-sdk/google';
// import axios from 'axios';
// import { z } from 'zod';

// // Define the SerpAPI tool with zod schema:
// const searchNews = tool({
//   name: 'searchNews',
//   description: 'Search for real-time news using SerpAPI.',
//   parameters: z.object({
//     query: z.string().describe('The news topic or search term to query.'),
//   }),
//   execute: async ({ query }: { query: string }) => {
//     const resp = await axios.get('https://serpapi.com/search.json', {
//       params: {
//         q: query,
//         api_key: process.env.SERP_API_KEY,
//         engine: 'google',
//       },
//     });
//     const results = (resp.data.organic_results || [])
//       .slice(0, 5)
//       .map((r: any) => ({
//         title: r.title,
//         link: r.link,
//         snippet: r.snippet,
//       }));
//     return { results, source: 'serp' };
//   },
// });

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const query = searchParams.get('query') || '';

//   if (!query.trim()) {
//     return NextResponse.json({ error: 'Missing query' }, { status: 400 });
//   }

//   // 1) Pre‑check for newsy terms:
//   const newsKeywords = [
//     'news', 'update', 'latest', 'today', 'recent', 'winner', 'score', 'result'
//   ];
//   const isNews = newsKeywords.some((w) =>
//     query.toLowerCase().includes(w)
//   );

//   // 2) If it's a news query, call SerpAPI directly:
//   if (isNews) {
//     try {
//       const { results } = await searchNews.execute({ query });
//       return NextResponse.json({ source: 'serp', results });
//     } catch (e: any) {
//       console.error('Direct SerpAPI error:', e);
//       return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
//     }
//   }

//   // 3) Otherwise, let Gemini answer (with tool available if still needed):
//   try {
//     const { text, toolResults } = await generateText({
//       model: google('models/gemini-1.5-flash'),
//       prompt: query,
//       tools: { searchNews },
//       // you can also force a function call here:
//       // functionCall: isNews ? { name: 'searchNews' } : 'auto',
//     });

//     // If Gemini ended up calling the tool:
//     const used = toolResults?.[0];
//     if (used?.name === 'searchNews') {
//       return NextResponse.json({
//         source: 'serp',
//         results: used.result.results || [],
//       });
//     }

//     // Otherwise return Gemini's text:
//     return NextResponse.json({ source: 'gemini', response: text });
//   } catch (e: any) {
//     console.error('Gemini error:', e);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }