import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Hugging Face embedding model (384-dim)
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const hf = new HfInference(process.env.HF_API_KEY);

// ✅ Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    // 1️⃣ Generate embeddings for the user query
    const embeddingResponse = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: message,
    });

    const queryEmbedding = embeddingResponse[0]; // Hugging Face returns [[...]], take first row

    // 2️⃣ Search similar policies in Supabase using RPC
    const { data, error } = await supabase.rpc("match_policies", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 1,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data || data.length === 0) {
      return res.json({ answer: "Sorry, I don’t know that yet." });
    }

    // 3️⃣ Return the best matching policy
    const bestPolicy = data[0];
    res.json({ answer: bestPolicy.content });

  } catch (err) {
    console.error("Chat endpoint error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Backend is working!"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
