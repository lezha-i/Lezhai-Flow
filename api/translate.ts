import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

// Lazy initialize Gemini safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di Settings > Secrets atau Environment Variables Vercel.");
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

// Helper with automatic retry and model fallback for high-demand / temporary / quota errors
const generateWithFallback = async (ai: GoogleGenAI, params: any) => {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash-8b"
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let modelFailed = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.warn(`Sending translation request to Vercel Serverless model: ${model} (attempt ${attempt})`);
        const response = await ai.models.generateContent({
          ...params,
          model: model,
        });
        console.warn(`Successfully translated with model on Vercel Serverless: ${model}`);
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err.message || "").toLowerCase();
        const status = err.status || (err.error && err.error.status) || "";
        const code = err.code || (err.error && err.error.code) || 0;

        // Check if it's an API Key or Authentication issue - these are fatal and won't work on other models
        const isFatalAuthError = 
          msg.includes("api key") || 
          msg.includes("invalid key") ||
          msg.includes("key_invalid") ||
          msg.includes("unauthorized") ||
          status === "UNAUTHENTICATED" ||
          status === "PERMISSION_DENIED" ||
          code === 401 ||
          code === 403;

        if (isFatalAuthError) {
          console.error(`Fatal Auth Error detected (${status}/${code}): ${msg}. Aborting model list.`);
          throw err;
        }

        const isTemporary =
          status === "UNAVAILABLE" ||
          code === 503 ||
          msg.includes("503") ||
          msg.includes("unavailable") ||
          msg.includes("high demand") ||
          msg.includes("temporary");

        if (isTemporary) {
          console.warn(`Model ${model} attempt ${attempt} failed with temporary error/high demand. Retrying... Error: ${msg}`);
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        } else {
          // For quota exhausted (429) or other model-specific errors, log and proceed to the next available model
          console.warn(`Model ${model} failed with error (${status}/${code}): ${msg}. Moving to the next model in fallback chain...`);
          modelFailed = true;
          break; // Break current attempt loop and move to next model
        }
      }
    }
    if (modelFailed) {
      continue;
    }
  }
  throw lastError || new Error("Semua model AI sedang melampaui kuota atau tidak tersedia. Silakan hubungi admin atau coba lagi nanti.");
};

export default async function handler(req: Request, res: Response) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    return res.status(200).json({ translation, extras });
  } catch (error: any) {
    console.error("Vercel translation function error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
