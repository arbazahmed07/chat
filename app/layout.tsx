import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatBot",
  description: "ChatBot powered by Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}





















































// "use client";
// import { useState } from "react";

// type SearchResult = {
//   title: string;
//   link: string;
//   snippet: string;
// };

// export default function Home() {
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState<SearchResult[]>([]);
//   const [aiResponse, setAiResponse] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSearch = async () => {
//     if (!query.trim()) return;

//     setLoading(true);
//     setResults([]);
//     setAiResponse('');

//     try {
//       const res = await fetch(`/api/ask?query=${encodeURIComponent(query)}`);
//       const data = await res.json();

//       if (data.source === 'serp') {
//         setResults(data.results || []);
//       } else if (data.source === 'gemini') {
//         setAiResponse(data.response);
//       } else {
//         setAiResponse('Something went wrong.');
//       }
//     } catch (err) {
//       console.error('Error:', err);
//       setAiResponse('Failed to get a response.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="p-6 max-w-xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Ask AI</h1>

//       <div className="flex gap-2 mb-4">
//         <input
//           className="flex-1 p-2 border rounded"
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           placeholder="Ask something or search news..."
//         />
//         <button
//           className="px-4 py-2 bg-blue-600 text-white rounded"
//           onClick={handleSearch}
//           disabled={loading}
//         >
//           {loading ? 'Loading...' : 'Ask'}
//         </button>
//       </div>

//       {results.length > 0 && (
//         <div className="mt-4">
//           <h2 className="text-xl font-semibold mb-2">News Results</h2>
//           <ul className="space-y-3">
//             {results.map((result, index) => (
//               <li key={index} className="border-b pb-2">
//                 <a
//                   href={result.link}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-600 hover:underline font-medium"
//                 >
//                   {result.title}
//                 </a>
//                 <p className="text-sm text-gray-700">{result.snippet}</p>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {aiResponse && (
//         <div className="mt-4">
//           <h2 className="text-xl font-semibold mb-2">Gemini Says</h2>
//           <p className="bg-gray-100 p-4 rounded">{aiResponse}</p>
//         </div>
//       )}
//     </main>
//   );
// }