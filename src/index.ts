import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface GenerateNoteRequestBody {
  transcript: string;
}

app.post(
  "/api/generate-note",
  async (req: Request<{}, {}, GenerateNoteRequestBody>, res: Response) => {
    try {
      const { transcript } = req.body;

      if (!transcript || !transcript.trim()) {
        return res.status(400).json({ error: "transcript is required" });
      }

      const prompt = `
You are an AI clinical note assistant. Take this doctor–patient conversation transcript
and produce a clear, structured clinical note (for example: Subjective, Objective, Assessment, Plan).

Transcript:
${transcript}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return res.json({ note: text });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to generate note" });
    }
  }
);

app.get("/", (_req: Request, res: Response) => {
  res.send("CliniScribe AI backend is running.");
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
