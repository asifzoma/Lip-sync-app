import { GoogleGenAI } from "@google/genai";
import { Gender } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export const detectGenderFromImage = async (imageFile: File): Promise<Gender> => {
    try {
        const imageB64 = await convertFileToBase64(imageFile);
        const imagePart = {
            inlineData: {
                mimeType: imageFile.type,
                data: imageB64,
            },
        };
        const textPart = {
            text: "Analyze the person in this image and determine their most likely gender. Respond with only the word 'male' or 'female'. If you cannot determine the gender, respond with 'male'.",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        const result = response.text.toLowerCase().trim();
        if (result === 'male' || result === 'female') {
            return result as Gender;
        }
        return Gender.MALE; // Default if response is unexpected
    } catch (error) {
        console.error('Error detecting gender:', error);
        if (error instanceof Error) {
            throw new Error(`Gender detection failed: ${error.message}`);
        }
        throw new Error('An unknown error occurred during gender detection.');
    }
};

export const startVideoGeneration = async (
    imageFile: File,
    script: string,
    gender: Gender,
): Promise<any> => { // Returns the operation object
    try {
        const imageB64 = await convertFileToBase64(imageFile);

        const operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: `Animate this person, who appears to be ${gender}, to speak the following words with natural lip movements and expressions: "${script}"`,
            image: {
                imageBytes: imageB64,
                mimeType: imageFile.type,
            },
            config: {
                numberOfVideos: 1,
            },
        });

        return operation;

    } catch (error) {
        console.error('Error starting video generation:', error);
        if (error instanceof Error) {
            if (error.message.includes('SAFETY')) {
                throw new Error('Generation failed: The request was blocked due to safety policies. Please try a different image or script.');
            }
             if (error.message.includes('API_KEY')) {
                throw new Error('Generation failed: Invalid API Key. Please check your configuration.');
            }
            throw new Error(`Failed to start generation: ${error.message}`);
        }
        throw new Error('An unknown error occurred while starting video generation.');
    }
};

export const checkVideoGenerationStatus = async (operation: any): Promise<any> => {
    try {
        const result = await ai.operations.getVideosOperation({ operation: operation });
        if (result.done && result.error) {
            throw new Error(`Generation failed: ${result.error.message || 'Unknown error from operation.'}`);
        }
        return result;
    } catch(error) {
        console.error('Error checking generation status:', error);
         if (error instanceof Error) {
            throw new Error(`Failed to check status: ${error.message}`);
        }
        throw new Error('An unknown error occurred while checking generation status.');
    }
}

export const downloadVideo = async (downloadLink: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error("API_KEY is not available for downloading video.");
    }
    const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);

    if (!videoResponse.ok) {
        throw new Error(`Failed to download video (${videoResponse.status}). Please try again.`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
}
