"use client";
import { useState, useRef, useEffect } from "react";

type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content?: string;
      results?: SearchResult[];
    };

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto‑scroll on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = query.trim();
    if (!text) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`/api/ask?query=${encodeURIComponent(text)}`);
      const data = await res.json();

      // ===== Updated handling to match your API shape =====
      if (data.searchPerformed && Array.isArray(data.results)) {
        // We got search results + content summary
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            results: data.results,
          },
        ]);
      } else if (typeof data.content === "string") {
        // No search needed, just plain AI answer
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
          },
        ]);
      } else {
        // Fallback error
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ I couldn’t find a proper answer.",
          },
        ]);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Failed to fetch response.",
        },
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
                <div className="inline-block bg-gray-100 p-2 rounded-lg mb-2 whitespace-pre-wrap">
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
