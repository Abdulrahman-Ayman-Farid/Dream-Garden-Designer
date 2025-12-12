
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateGardenImage(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Photorealistic, award-winning photo of: ${prompt}. High detail, vibrant colors, professional quality.`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      } else {
        throw new Error('No image was generated. The prompt might be unsafe.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Image generation failed. Please check your prompt and API key.');
    }
  }

  async getNewPromptFromImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      };
      
      const textPart = {
        text: `Based on the provided image of a garden, generate a new, highly detailed, and vivid prompt for an image generation model. The new prompt should incorporate the following user request: "${prompt}". The output should be only the new prompt itself, ready to be used to generate a new image.`,
      };

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      
      const newPrompt = response.text;
      if (!newPrompt) {
          throw new Error("Could not generate a new prompt from the image.");
      }
      return newPrompt;

    } catch (error) {
      console.error('Error generating new prompt from image:', error);
      throw new Error('Failed to interpret the image and edit request.');
    }
  }
}
