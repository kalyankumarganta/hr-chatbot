import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

if (!SUPABASE_URL || !SUPABASE_KEY || !HF_API_KEY) {
  console.error("Missing environment variables for Supabase or Hugging Face");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const hf = new HfInference(HF_API_KEY);

async function backfillEmbeddings() {
  try {
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
        const embeddingResponse = await hf.featureExtraction({
          model: EMBEDDING_MODEL,
          inputs: policy.content,
        });

        // Handle different response shapes
        let embeddingArray;
        if (Array.isArray(embeddingResponse[0])) {
          // Nested array
          embeddingArray = embeddingResponse[0];
        } else {
          embeddingArray = embeddingResponse;
        }

        const embeddingString = `[${embeddingArray.join(",")}]`;

        const { error: updateError } = await supabase
          .from("policies")
          .update({ embedding: embeddingString })
          .eq("id", policy.id);

        if (updateError) {
          console.error(`Error updating policy ${policy.id}:`, updateError);
        } else {
          console.log(`Policy ${policy.id} backfilled`);
        }

      } catch (hfErr) {
        console.error(`Error embedding policy ${policy.id}:`, hfErr);
      }
    }

    console.log("Backfill complete.");

  } catch (err) {
    console.error("Error fetching policies:", err);
  }
}

backfillEmbeddings();
