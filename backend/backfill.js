// backfill.js
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const hfApiKey = process.env.HF_API_KEY;

console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_KEY:", supabaseKey ? "Loaded" : "Missing");
console.log("HF_API_KEY:", hfApiKey ? "Loaded" : "Missing");

const supabase = createClient(supabaseUrl, supabaseKey);
const hf = new HfInference(hfApiKey);

// Chosen embedding model (must be same everywhere!)
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function backfillEmbeddings() {
  try {
    // Fetch all policies that don’t have embeddings
    const { data: policies, error } = await supabase
      .from("policies")
      .select("id, content")
      .is("embedding", null);

    if (error) throw error;
    if (!policies || policies.length === 0) {
      console.log(" No policies found without embeddings.");
      return;
    }

    console.log(`Found ${policies.length} policies to backfill...`);

    for (const policy of policies) {
      try {
        // Create embedding
        const embeddingResponse = await hf.featureExtraction({
          model: EMBEDDING_MODEL,
          inputs: policy.content,
        });

        // Ensure it’s a flat Float32Array (Supabase expects array of floats)
        const embedding = Array.isArray(embeddingResponse[0])
          ? embeddingResponse[0]
          : embeddingResponse;

        // Save embedding back into Supabase
        const { error: updateError } = await supabase
          .from("policies")
          .update({ embedding })
          .eq("id", policy.id);

        if (updateError) {
          console.error(` Error updating policy ${policy.id}:`, updateError);
        } else {
          console.log(`Embedded & updated policy ${policy.id}`);
        }
      } catch (err) {
        console.error(` Error embedding policy ${policy.id}:`, err);
      }
    }

    console.log("🎉 Backfill complete!");
  } catch (err) {
    console.error("Error fetching policies:", err);
  }
}

backfillEmbeddings();
