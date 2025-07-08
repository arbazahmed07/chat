
"use client";
import {useState} from 'react';
type SearchResult = {
  title: string;
  link: string;
  snippet: string;
}


export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // console.log("env",process.env.SERP_API_KEY);
const handleSearch = async () => {
  console.log("calling handleSearch with query:", query);
  if(!query.trim()){
    return;
  }
  setLoading(true);
  try {
    const res= await fetch(`/api/serp?query=${encodeURIComponent(query)}`);
    console.log("res",res);
    const data = await res.json();
    setResults(data.organic_results || []);
    setLoading(false);    
  } catch (error) {
    console.error('Error fetching search results:', error);
    setLoading(false);
  }

}
  return (
   <main>
    <h1>Web search</h1>
    <input value={query}
     onChange={(e) => setQuery(e.target.value)} 
     placeholder='search me'  />
    <button onClick={handleSearch}>Search</button>
    {loading && <p>Loading...</p>}
    <ul>
      {results.map((result, index) => (
        <li key={index}>
          <a href={result.link} target="_blank" rel="noopener noreferrer">
            {result.title}
          </a>
          <p>{result.snippet}</p>

        </li>
      ))}
    </ul>
   </main>

  );
}
