import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Root test route
app.get("/", (req, res) => res.send("Backend is working!"));

// Chat route
app.post("/chat", (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // For now, just echo back (later you’ll add Hugging Face / Supabase logic)
  const botReply = `You asked: "${question}". (This is a placeholder response from HR bot ✅)`;

  res.json({ answer: botReply });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
