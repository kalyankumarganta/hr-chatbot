"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "bot";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: input }]);

    const userInput = input;
    setInput("");

    try {
      // Call backend
      const res = await fetch("https://hr-chatbot-1-m1fk.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await res.json();

      const botReply = data.answer || "Sorry, I don’t know that yet.";

      // Add bot message
      setMessages((prev) => [...prev, { role: "bot", content: botReply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", content: "Error connecting to backend." }]);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-4">
        <h1 className="text-xl font-bold mb-4">HR Policy Chatbot</h1>

        <div className="h-96 overflow-y-auto border rounded p-2 mb-4">
          {messages.map((m, i) => (
            <p
              key={i}
              className={m.role === "user" ? "text-blue-600" : "text-green-600"}
            >
              <b>{m.role}:</b> {m.content}
            </p>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border rounded-l px-2"
            placeholder="Ask about HR policies..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
