import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

// New SDK client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CliniScribe backend running" });
});
app.post("/api/generate-note", async (req, res) => {
  const { transcript } = req.body as { transcript?: string };

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "Transcript is required." });
  }

  try {
    const prompt = `
    You are an AI medical scribe.

    Take the following doctor–patient conversation and write a clinical note BODY in SOAP format.

    Do NOT include patient header fields like name, MRN, DOB, date, or provider name.
    Only write the SOAP sections exactly in this order and format:

    SUBJECTIVE:
    [short paragraphs and sentences]

    OBJECTIVE:
    [only include findings explicitly stated in the transcript; if nothing is stated, write "No objective data documented in this transcript."]

    ASSESSMENT:
    [1–2 concise assessment statements summarizing the main problem and relevant risk factors]

    PLAN:
    [bullet-style lines starting with "-" but no markdown symbols]

    Rules:
    - Do NOT use any markdown formatting. No asterisks, no bold, no numbered markdown lists.
    - Do NOT invent vitals, physical exam, or lab values.
    - If something is not mentioned, either omit it or briefly state that it is not documented in this transcript.
    - Use clear, plain text that could be pasted directly into an EHR note.

    TRANSCRIPT:
    ${transcript}
    `.trim();


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = response.text ?? "";

    if (!text) {
      return res
        .status(500)
        .json({ error: "Model returned an empty response." });
    }

    return res.json({ note: text });
  } catch (err: any) {
    console.error("Gemini error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "Error generating note from Gemini. Check backend logs.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});
