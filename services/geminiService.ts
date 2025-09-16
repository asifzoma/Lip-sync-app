
import { GoogleGenAI } from "@google/genai";
import { LOADING_MESSAGES } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateLipSyncVideo = async (
    imageB64: string,
    mimeType: string,
    script: string,
    updateLoadingMessage: (message: string) => void
): Promise<string> => {
    try {
        updateLoadingMessage(LOADING_MESSAGES[0]);
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: `Animate this person to speak the following words with natural lip movements and expressions: "${script}"`,
            image: {
                imageBytes: imageB64,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
            },
        });
        
        updateLoadingMessage("Video generation process started. This may take a few minutes.");

        // Poll for the result
        let checks = 0;
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
            
            checks++;
            // Cycle through messages to show progress
            const messageIndex = (checks + 1) % LOADING_MESSAGES.length;
            updateLoadingMessage(LOADING_MESSAGES[messageIndex]);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation succeeded but no download link was provided.");
        }

        updateLoadingMessage("Generation complete! Downloading video...");

        // The downloadLink needs the API key appended
        const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
        
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video. Status: ${videoResponse.statusText}`);
        }

        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error('Error generating video:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate video: ${error.message}`);
        }
        throw new Error('An unknown error occurred during video generation.');
    }
};
