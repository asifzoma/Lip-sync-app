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

export const transcribeAudio = async (audioFile: File): Promise<string> => {
    try {
        const audioB64 = await convertFileToBase64(audioFile);
        const audioPart = {
            inlineData: {
                mimeType: audioFile.type,
                data: audioB64,
            },
        };
        const textPart = {
            text: "Transcribe the following audio recording accurately. Only return the transcribed text.",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error transcribing audio:', error);
        if (error instanceof Error) {
            throw new Error(`Audio transcription failed: ${error.message}`);
        }
        throw new Error('An unknown error occurred during audio transcription.');
    }
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

export const findOffendingWords = async (script: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The following script was blocked by a safety filter during video generation. Analyze it carefully to identify specific words or short phrases that were the most likely cause. Consider the context; for example, words like "horror" or "weapon" might be acceptable in a movie review but not in other contexts. Avoid flagging words that are likely false positives. Return a JSON object with a single key "offendingWords" containing an array of the identified strings. If you cannot confidently identify any problematic words, return an empty array. Script: "${script}"`,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonText = response.text.trim();
        // The model might wrap the JSON in markdown backticks, so we clean it.
        const cleanedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');
        const result = JSON.parse(cleanedJsonText);
        if (result && Array.isArray(result.offendingWords)) {
            return result.offendingWords;
        }
        return [];
    } catch (error) {
        console.error('Error analyzing script for offending words:', error);
        return []; // Return empty array on failure to avoid breaking the flow
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
            prompt: `Animate the subject in this image, whose voice sounds ${gender}, to speak the following words with natural lip movements and expressions: "${script}"`,
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
            if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
                throw new Error('Generation failed: The provided API Key is invalid. Please check your configuration.');
            }
            if (error.message.includes('SAFETY')) {
                const offendingWords = await findOffendingWords(script);
                if (offendingWords.length > 0) {
                    throw new Error(`SAFETY_VIOLATION::${JSON.stringify(offendingWords)}`);
                }
                throw new Error('Generation failed: The request was blocked due to safety policies. Please try a different image or script.');
            }
             if (error.message.includes('quota')) {
                throw new Error('Generation failed: You have exceeded your API quota. Please check your account limits.');
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
             const errorMessage = (result.error as any)?.message;
             if (errorMessage && typeof errorMessage === 'string') {
                  if (errorMessage.includes('Deadline exceeded')) {
                    throw new Error('Generation failed: The request timed out. This can happen with complex requests. Please try again.');
                 }
             }
            throw new Error(`Generation failed: ${errorMessage || 'An unknown error occurred during processing.'}`);
        }
        return result;
    } catch(error) {
        console.error('Error checking generation status:', error);
         if (error instanceof Error) {
            throw new Error(`${error.message}`);
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