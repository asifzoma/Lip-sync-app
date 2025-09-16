
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { Loader } from './components/Loader';
import { generateLipSyncVideo } from './services/geminiService';
import { LOADING_MESSAGES } from './constants';
import type { AppState } from './types';
import { Status } from './types';


const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [script, setScript] = useState<string>('');
  const [appState, setAppState] = useState<AppState>({ status: Status.IDLE });
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (appState.status === Status.LOADING) {
      const interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
          return LOADING_MESSAGES[nextIndex];
        });
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [appState.status]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove the "data:image/jpeg;base64," part
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !script) {
      setAppState({ status: Status.ERROR, error: 'Please provide both an image and a script.' });
      return;
    }

    setAppState({ status: Status.LOADING });
    setLoadingMessage(LOADING_MESSAGES[0]);

    try {
      const imageB64 = await convertFileToBase64(imageFile);
      const videoUrl = await generateLipSyncVideo(imageB64, imageFile.type, script, (message: string) => setLoadingMessage(message));
      setAppState({ status: Status.SUCCESS, videoUrl });
    } catch (error) {
      console.error("Video generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during video generation.";
      setAppState({ status: Status.ERROR, error: errorMessage });
    }
  };
  
  const isFormSubmittable = imageFile && script.trim().length > 0 && appState.status !== Status.LOADING;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <Header />
      <main className="w-full max-w-4xl mx-auto flex-grow flex flex-col items-center justify-center">
        <div className="w-full bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-700">
          {appState.status !== Status.SUCCESS ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FileUpload
                  onFileChange={handleImageChange}
                  previewUrl={imagePreviewUrl}
                  disabled={appState.status === Status.LOADING}
                />
                <div className="flex flex-col">
                  <label htmlFor="script" className="mb-2 font-semibold text-lg text-teal-300">
                    2. Enter Your Script
                  </label>
                  <textarea
                    id="script"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter the words you want the image to speak..."
                    className="w-full h-full min-h-[200px] flex-grow bg-gray-700 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 text-gray-200 placeholder-gray-400 disabled:opacity-50"
                    rows={8}
                    disabled={appState.status === Status.LOADING}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!isFormSubmittable}
                className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                {appState.status === Status.LOADING ? (
                  <Loader message="" inline={true} />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Generate Video</span>
                  </>
                )}
              </button>
            </form>
          ) : null}

          {appState.status === Status.LOADING && <Loader message={loadingMessage} />}
          
          {appState.status === Status.ERROR && (
            <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="font-bold text-red-400">Error</p>
              <p className="text-red-300">{appState.error}</p>
              <button onClick={() => setAppState({status: Status.IDLE})} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg">Try Again</button>
            </div>
          )}

          {appState.status === Status.SUCCESS && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-teal-300">Your Animated Video is Ready!</h2>
              <VideoPlayer src={appState.videoUrl} />
              <button
                onClick={() => {
                  setAppState({ status: Status.IDLE });
                  handleImageChange(null);
                  setScript('');
                }}
                className="mt-6 py-2 px-6 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
              >
                Create Another Video
              </button>
            </div>
          )}
        </div>
        <footer className="w-full text-center py-6 mt-8 text-gray-500">
            <p>Powered by Gemini. Create, Animate, and Inspire.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
