import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

/**
 * Singleton Gemini AI instance – null if no API key configured.
 * Every AI route should use this instead of creating its own instance.
 */
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/** Check whether the Gemini API key is configured */
export function isGeminiConfigured(): boolean {
  return genAI !== null;
}

/**
 * 3-Tier Fallback: Gemini 2.5 Flash → Gemini 2.0 Flash-Lite → Rule-based.
 *
 * @param prompt      - The prompt to send to Gemini
 * @param fallbackFn  - A function that returns a rule-based string if both API calls fail
 * @returns           - The generated text (trimmed)
 */
export async function callGeminiWithFallback(
  prompt: string,
  fallbackFn: () => string,
): Promise<string> {
  if (!genAI) {
    return fallbackFn();
  }

  // Tier 1: Gemini 2.5 Flash (most capable)
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn("[Gemini] 2.5 Flash failed, trying Tier 2 (Flash-Lite):", err);
  }

  // Tier 2: Gemini 2.0 Flash-Lite (lighter, cheaper)
  try {
    const liteModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });
    const liteResult = await liteModel.generateContent(prompt);
    return liteResult.response.text().trim();
  } catch (err) {
    console.warn(
      "[Gemini] Flash-Lite also failed, falling back to rule-based:",
      err,
    );
  }

  // Tier 3: Rule-based (guaranteed to work)
  return fallbackFn();
}
