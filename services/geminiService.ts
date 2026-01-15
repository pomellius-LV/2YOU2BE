
import { GoogleGenAI } from "@google/genai";

export interface GeminiResult<T> {
  data: T;
  tokens: number;
}

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Generates a visual prompt for background images based on lyrics.
   * Simple and fast, no audio parsing involved.
   */
  static async generateVisualPrompt(lyrics: string, model: string = 'gemini-3-flash-preview'): Promise<GeminiResult<string>> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Analyze these song lyrics and create a professional, artistic, cinematic visual prompt for a background image. 
        Focus on mood, lighting, and style. Output ONLY the prompt string.
        
        Lyrics: ${lyrics.substring(0, 1000)}`,
      });

      const tokens = (response as any).usageMetadata?.totalTokenCount || 0;
      return {
        data: response.text?.trim() || "A cinematic atmospheric music video background with deep colors.",
        tokens
      };
    } catch (e) {
      console.error("Visual prompt generation failed", e);
      return { data: "Abstract cinematic music background", tokens: 0 };
    }
  }

  /**
   * Generates a high-quality background image.
   */
  static async generateBackgroundImage(prompt: string, model: string = 'gemini-2.5-flash-image'): Promise<GeminiResult<string>> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [{ text: `Cinematic 4K music video background, artistic, high resolution, no text: ${prompt}` }]
        },
        config: {
          imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
        }
      });

      const tokens = (response as any).usageMetadata?.totalTokenCount || 0;
      let base64Data = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }
      if (!base64Data) throw new Error("No image returned");
      return { data: `data:image/png;base64,${base64Data}`, tokens };
    } catch (e) {
      console.error("Image generation failed", e);
      throw e;
    }
  }
}
