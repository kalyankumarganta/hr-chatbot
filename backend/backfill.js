import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const hf = new HfInference(process.env.HF_API_KEY);

// Embedding model: MiniLM (384-dim)
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function backfillEmbeddings() {
  try {
    // 1️⃣ Fetch all policies that have null embedding
    const { data: policies, error } = await supabase
      .from("policies")
      .select("id, content")
      .is("embedding", null);

    if (error) throw error;

    if (!policies || policies.length === 0) {
      console.log("No policies found without embeddings.");
      return;
    }

    console.log(`Found ${policies.length} policies to backfill...`);

    for (const policy of policies) {
      try {
        // 2️⃣ Generate embedding
        const embeddingResponse = await hf.featureExtraction({
          model: EMBEDDING_MODEL,
          inputs: policy.content,
        });

        const embedding = embeddingResponse[0]; // array of 384 floats

        // 3️⃣ Update policy in Supabase
        const { error: updateError } = await supabase
          .from("policies")
          .update({ embedding })
          .eq("id", policy.id);

        if (updateError) {
          console.error(`Error updating policy ${policy.id}:`, updateError);
        } else {
          console.log(`Policy ${policy.id} backfilled.`);
        }

      } catch (embedErr) {
        console.error(`Error embedding policy ${policy.id}:`, embedErr);
      }
    }

    console.log("Backfill complete.");

  } catch (err) {
    console.error("Error fetching policies:", err);
  }
}

// Run the script
backfillEmbeddings();
