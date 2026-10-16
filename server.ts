import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API endpoints for AI Features

// 1. Study Assistant Chatbot
app.post("/api/gemini/chatbot", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemInstruction = `
      You are "TechHelp AI Study Assistant", an empathetic, highly knowledgeable AI tutor for college and university students.
      Offer guidance on computer science, engineering, maths, study tips, active recall techniques, and general career help.
      Keep answers clear, visually structured, using bullet points, bold keywords, or short code snippets where appropriate.
      Never mention being a general model or that you are from Google, unless asked.
    `;

    // Reconstruct contents for generateContent
    // history has shape: [{ role: 'user' | 'model', text: string }]
    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Add current message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Chatbot API Error:", error);
    res.status(500).json({ error: error.message || "AI Service Error" });
  }
});

// 2. AI Resume Builder
app.post("/api/gemini/resume", async (req, res) => {
  try {
    const { name, email, phone, education, skills, experience, projects } = req.body;

    const prompt = `
      Create a highly professional, industry-tailored ATS-friendly Resume (Markdown Format) using the following detail:
      Name: ${name}
      Email: ${email}
      Phone: ${phone}
      Education: ${education}
      Skills: ${skills}
      Experience: ${experience}
      Projects: ${projects}

      Follow standard Harvard Resume styling guidelines:
      - Do not include an introductory paragraph. Instead, jump straight into Education and Skills.
      - Each project/job bullet point must start with a action verbs (e.g., Developed, Orchestrated, Designed, Spearheaded, Engineered).
      - Include numeric metrics where relevant (e.g., "improving latency by 15%", "gaining 150+ user registrations").
      Format with clear Markdown headers (## Skills, ## Projects, etc.) so it can be elegantly rendered in our web theme. Include professional tips for enhancing the resume too at the very bottom inside a tips block.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ resume: response.text });
  } catch (error: any) {
    console.error("Resume Builder API Error:", error);
    res.status(500).json({ error: error.message || "AI Resume Service Error" });
  }
});

// 3. AI Career Roadmap Generator
app.post("/api/gemini/roadmap", async (req, res) => {
  try {
    const { goal, currentLevel } = req.body;

    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const prompt = `
      Create a detailed step-by-step career path learning roadmap to become a successful: "${goal}".
      Current Student Status / Level: "${currentLevel || 'Beginner'}".
      Provide a structured curriculum spanning 4 sequential phases:
      Phase 1: Foundations (Month 1-2)
      Phase 2: Core Concepts & Projects (Month 3-4)
      Phase 3: Advanced Skills & Contributions (Month 5-6)
      Phase 4: Interview Prep & Applications (Month 7-8)

      Additionally, for each phase, include:
      - Key skills to master
      - 2 highly practical project subjects they should build
      - Recommendations of free websites/resources
      Make the response engaging and return it in a clean presentation format (Markdown).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ roadmap: response.text });
  } catch (error: any) {
    console.error("Roadmap API Error:", error);
    res.status(500).json({ error: error.message || "AI Roadmap Service Error" });
  }
});

// 4. AI Interview Questions Generator
app.post("/api/gemini/interview", async (req, res) => {
  try {
    const { role, industry } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role/Subject is required" });
    }

    const systemInstruction = `
      You are an expert technical interviewer representing leading tech recruiters.
      Generate 5 mock interview questions specific to the role: "${role}" in the "${industry || 'general tech'}" industry.
      For each question, provide:
      - Question statement
      - The reasoning behind asking this question
      - Hints on what a strong response looks like
      - An exemplar top-tier answer skeleton
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate 5 structured technical interview questions for: ${role}`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ interviewQuestions: response.text });
  } catch (error: any) {
    console.error("Interview API Error:", error);
    res.status(500).json({ error: error.message || "AI Interview Service Error" });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TechHelp Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
export default app;
