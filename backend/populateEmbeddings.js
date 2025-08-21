import fetch from "node-fetch";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// Connect to Supabase Postgres
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

// Hugging Face embedding model
const HF_API_KEY = process.env.HF_API_KEY;
const EMBEDDING_MODEL = "<embedding-model>"; // e.g., "sentence-transformers/all-MiniLM-L6-v2"

async function getEmbedding(text) {
  const resp = await fetch(
    `https://api-inference.huggingface.co/embedding/${EMBEDDING_MODEL}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  const data = await resp.json();
  return data[0]?.embedding || Array(1536).fill(0);
}

async function updateEmbeddings() {
  const { rows } = await pool.query("SELECT id, content FROM policies");

  for (let row of rows) {
    const embedding = await getEmbedding(row.content);
    await pool.query("UPDATE policies SET embedding = $1 WHERE id = $2", [
      embedding,
      row.id,
    ]);
    console.log(`Updated embedding for policy: ${row.id}`);
  }

  console.log("All embeddings updated ✅");
  pool.end();
}

updateEmbeddings();
