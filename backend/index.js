import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Hugging Face clients
const hfEmbedding = new HfInference(process.env.HF_API_KEY);
const hfGeneration = new HfInference(process.env.HF_API_KEY);

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// MiniLM embeddings (384-dim) for vector search
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

// Mistral text-generation model
const GENERATION_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

// Health check
app.get("/", (req, res) => res.send("Backend is working!"));

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    // 1️⃣ Embed user question
    const embeddingResponse = await hfEmbedding.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: message,
    });

    const queryEmbedding = embeddingResponse[0]; // 384 floats

    // 2️⃣ Search Supabase policies
    const { data: matchedPolicies, error } = await supabase.rpc("match_policies", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3,
    });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!matchedPolicies || matchedPolicies.length === 0) {
      return res.json({ answer: "Sorry, I don’t know that yet." });
    }

    // 3️⃣ Combine matched policies into prompt
    const contextText = matchedPolicies.map(p => p.content).join("\n");

    const prompt = `
You are an HR assistant. Answer the user's question based on the following policies:

Policies:
${contextText}

User question:
${message}

Answer:
`;

    // 4️⃣ Generate answer with Mistral
    const generation = await hfGeneration.textGeneration({
      model: GENERATION_MODEL,
      inputs: prompt,
      parameters: { max_new_tokens: 200 }
    });

    const botAnswer = generation.generated_text || "Sorry, I don’t know that yet.";

    // 5️⃣ Return answer
    res.json({ answer: botAnswer });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
