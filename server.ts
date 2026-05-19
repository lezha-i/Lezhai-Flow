import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage, tone, context } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const systemInstruction = `Anda adalah AI Penerjemah Profesional yang akurat, natural, dan peka terhadap konteks budaya (localized). Tugas Anda adalah menerjemahkan teks dari bahasa sumber ke bahasa target yang diminta oleh pengguna.

Patuhi aturan berikut dalam menerjemahkan:
1. Akurasi & Konteks: Jangan hanya menerjemahkan kata per kata. Sesuaikan dengan idiom, budaya, dan maksud asli dari teks tersebut agar terdengar alami bagi penutur asli (native speaker).
2. Nada Bicara (Tone): Pertahankan nada bicara teks asli (apakah formal, santai/kasual, puitis, atau profesional/bisnis). Saat ini, pengguna secara spesifik meminta nada bicara: ${tone || 'sesuai teks asli'}.
3. Format Output: Berikan hasil terjemahan langsung tanpa basa-basi. Jika ada penjelasan tambahan atau alternatif penting, berikan di bawah hasil terjemahan utama dengan pemisah "---".
4. Deteksi Otomatis: Jika pengguna tidak menyebutkan bahasa sumber, deteksi bahasanya secara otomatis dan langsung terjemahkan ke bahasa target yang diminta (${targetLanguage}).
5. Konteks Tambahan: ${context || 'Tidak ada konteks tambahan'}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Terjemahkan ke ${targetLanguage}: ${text}`,
        config: {
          systemInstruction,
        },
      });

      const result = response.text || "";
      const parts = result.split("---");
      const translation = parts[0]?.trim();
      const extras = parts[1]?.trim();

      res.json({ translation, extras });
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
