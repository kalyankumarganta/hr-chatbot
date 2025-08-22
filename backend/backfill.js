import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const hf = new HfInference(process.env.HF_API_KEY);

// Make sure your embedding model is correct for vectors
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function backfillEmbeddings() {
  try {
    // 1️⃣ Fetch policies with NULL embeddings
    const { data: policies, error: fetchError } = await supabase
      .from("policies")
      .select("id, content")
      .is("embedding", null);

    if (fetchError) throw fetchError;

    if (!policies || policies.length === 0) {
      console.log("No policies found without embeddings.");
      return;
    }

    console.log(`Found ${policies.length} policies to backfill...`);

    // 2️⃣ Loop through each policy and generate embedding
    for (const policy of policies) {
      try {
        const embeddingResponse = await hf.featureExtraction({
          model: EMBEDDING_MODEL,
          inputs: policy.content,
        });

        // Hugging Face returns [ [num, num, ...] ]
        const embeddingArray = Array.isArray(embeddingResponse[0])
          ? embeddingResponse[0]
          : embeddingResponse;

        if (!embeddingArray || embeddingArray.length !== 384) {
          throw new Error(`Invalid embedding length: ${embeddingArray.length}`);
        }

        // 3️⃣ Store embedding as proper vector array in Supabase
        const { error: updateError } = await supabase
          .from("policies")
          .update({ embedding: embeddingArray })
          .eq("id", policy.id);

        if (updateError) {
          console.error(`Error updating policy ${policy.id}:`, updateError);
        } else {
          console.log(`Policy ${policy.id} backfilled successfully.`);
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

backfillEmbeddings();
