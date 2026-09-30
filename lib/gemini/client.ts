import { GoogleGenAI } from "@google/genai";

// Server-side only — never import in client components
let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export const FAST_MODEL = process.env.GEMINI_MODEL_FAST ?? "gemini-2.5-flash";
export const PRO_MODEL = process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-pro";

/** Generate content (non-streaming) */
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  usePro = false
): Promise<string> {
  const client = getClient();
  const modelId = usePro ? PRO_MODEL : FAST_MODEL;

  const response = await client.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 65536,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

/** Stream generation — yields text chunks */
export async function* generateContentStream(
  systemPrompt: string,
  userPrompt: string,
  usePro = false
): AsyncGenerator<string> {
  const client = getClient();
  const modelId = usePro ? PRO_MODEL : FAST_MODEL;

  const stream = await client.models.generateContentStream({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 65536,
    },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}
