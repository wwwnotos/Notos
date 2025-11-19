import { GoogleGenAI } from "@google/genai";

// Initialize the client
// process.env.API_KEY is assumed to be available
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Polishes the text to be more poetic or concise.
 * @param text The original user text
 */
export const polishText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite the following text to be more poetic, concise, and evocative. Keep it under 280 characters if possible. Do not add quotes unless they are part of the style. Text: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini polish error:", error);
    return text; // Fallback to original
  }
};

/**
 * Suggests hashtags based on the text.
 * @param text The note content
 */
export const suggestTags = async (text: string): Promise<string[]> => {
    if (!text.trim()) return [];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this text: "${text}". Suggest 3 relevant, trending social media hashtags. Return ONLY the hashtags separated by spaces. Example output: #art #design #colors`,
      });
      
      const raw = response.text || "";
      const tags = raw.split(' ').filter(t => t.startsWith('#')).slice(0, 3);
      return tags;
    } catch (error) {
      console.error("Gemini tag error:", error);
      return [];
    }
};