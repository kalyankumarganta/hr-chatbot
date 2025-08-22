import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("Backend is working!"));

//  Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    let botReply = "Sorry, I don’t know that yet.";

    if (message.toLowerCase().includes("leave")) {
      botReply = "Our leave policy allows 20 days of paid leave per year.";
    } else if (message.toLowerCase().includes("work from home")) {
      botReply = "Employees can take up to 2 WFH days per week with manager approval.";
    }

    res.json({ answer: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
