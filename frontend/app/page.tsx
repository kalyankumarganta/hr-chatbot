"use client";
import { useState } from "react";

export default function Home() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");

async function sendMessage() {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);

    try {
        const res = await fetch("https://hr-chatbot-1-m1fk.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input }), // ✅ fixed
        });

        const data = await res.json();
        console.log("Backend response:", data); // ✅ debug log

        setMessages((prev) => [
            ...prev,
            { role: "bot", content: data.answer || data.message || "No reply from bot" },
        ]);
    } catch (err) {
        console.error("Error talking to backend:", err);
        setMessages((prev) => [
            ...prev,
            { role: "bot", content: "⚠️ Failed to reach backend" },
        ]);
    }

    setInput("");
}

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-4">
                <h1 className="text-xl font-bold mb-4">HR Policy Chatbot</h1>

                <div className="h-96 overflow-y-auto border rounded p-2 mb-4">
                    {messages.map((m, i) => (
                        <p key={i} className={m.role === "user" ? "text-blue-600" : "text-green-600"}>
                            <b>{m.role}:</b> {m.content}
                        </p>
                    ))}
                </div>

                <div className="flex">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 border rounded-l px-2"
                        placeholder="Ask about HR policies..."
                    />
                    <button
                        onClick={sendMessage}
                        className="bg-blue-500 text-white px-4 rounded-r"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
