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

app.get("/", (req, res) => res.send("Backend is working!"));

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });

    //  Get embeddings for the question
    const embRes = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2", // Embedding model
      inputs: message,
    });

    const embedding = Array.from(embRes[0]); // HF returns nested array

    // Query Supabase for closest HR policy
    const { data: matches, error } = await supabase.rpc("match_policies", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 2
    });

    if (error) throw error;

    const context = matches?.map(m => m.content).join("\n") || "No relevant HR policy found.";

    //  Generate answer with Mistral-7B-Instruct
    const botRes = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: `You are an HR assistant. Use the context below to answer the employee’s question.\n\nContext:\n${context}\n\nUser: ${message}\nHR Bot:`,
      parameters: { max_new_tokens: 300, temperature: 0.5 }
    });

    res.json({ answer: botRes.generated_text });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
