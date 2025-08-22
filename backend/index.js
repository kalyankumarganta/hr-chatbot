import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const hf = new HfInference(process.env.HF_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Chat endpoint with embeddings
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    // 1. Embed user question
    const embeddingResponse = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2", // embeddings model
      inputs: message,
    });

    // Normalize response array
    const embeddingArray = Array.isArray(embeddingResponse[0])
      ? embeddingResponse[0]
      : embeddingResponse;

    const embeddingString = `[${embeddingArray.join(",")}]`;

    // 2. Call Supabase RPC or query to match policies using pgvector
    const { data, error } = await supabase.rpc("match_policies", {
      query_embedding: embeddingString,
      match_threshold: 0.7,
      match_count: 1,
    });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data || data.length === 0) {
      return res.json({ answer: "Sorry, I don’t know that yet." });
    }

    // 3. Return the best match
    const bestPolicy = data[0];
    res.json({ answer: bestPolicy.content });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
