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

  // Lazy initialize Gemini safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi di Settings > Secrets.");
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Helper with automatic retry and model fallback for high-demand / temporary errors
  const generateWithFallback = async (ai: GoogleGenAI, params: any) => {
    const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.warn(`Sending translation request to model: ${model} (attempt ${attempt})`);
          const response = await ai.models.generateContent({
            ...params,
            model: model,
          });
          console.warn(`Successfully translated with model: ${model}`);
          return response;
        } catch (err: any) {
          lastError = err;
          const msg = String(err.message || "").toLowerCase();
          const status = err.status || (err.error && err.error.status) || "";
          const code = err.code || (err.error && err.error.code) || 0;

          const isTemporary =
            status === "UNAVAILABLE" ||
            code === 503 ||
            msg.includes("503") ||
            msg.includes("unavailable") ||
            msg.includes("high demand") ||
            msg.includes("temporary");

          if (isTemporary) {
            console.warn(`Model ${model} attempt ${attempt} failed with high-demand/temporary error. Retrying in 500ms... Error: ${msg}`);
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          } else {
            // Re-throw hard/auth/configuration errors immediately
            console.error(`Model ${model} failed with non-temporary error: ${msg}. Re-throwing...`);
            throw err;
          }
        }
      }
    }
    throw lastError || new Error("Semua model AI sedang sibuk. Silakan coba beberapa saat lagi.");
  };

  // API Routes
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage, tone, context } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const ai = getGeminiClient();

      const systemInstruction = `Anda adalah AI Penerjemah Profesional yang akurat, natural, dan peka terhadap konteks budaya (localized). Tugas Anda adalah menerjemahkan teks dari bahasa sumber ke bahasa target yang diminta oleh pengguna.

Patuhi aturan berikut dalam menerjemahkan:
1. Akurasi & Konteks: Jangan hanya menerjemahkan kata per kata. Sesuaikan dengan idiom, budaya, dan maksud asli dari teks tersebut agar terdengar alami bagi penutur asli (native speaker).
2. Nada Bicara (Tone): Pertahankan nada bicara teks asli (apakah formal, santai/kasual, puitis, atau profesional/bisnis). Saat ini, pengguna secara spesifik meminta nada bicara: ${tone || 'sesuai teks asli'}.
3. Format Output: Berikan hasil terjemahan langsung tanpa basa-basi. Jika ada penjelasan tambahan atau alternatif penting, berikan di bawah hasil terjemahan utama dengan pemisah "---".
4. Deteksi Otomatis: Jika pengguna tidak menyebutkan bahasa sumber, deteksi bahasanya secara otomatis dan langsung terjemahkan ke bahasa target yang diminta (${targetLanguage}).
5. Konteks Tambahan: ${context || 'Tidak ada konteks tambahan'}.`;

      const response = await generateWithFallback(ai, {
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
